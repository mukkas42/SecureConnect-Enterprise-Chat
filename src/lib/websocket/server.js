/**
 * @fileoverview WebSocket server for SecureConnect Enterprise Chat
 * Main WebSocket server that handles all chat operations through WebSocket connections
 */

import { WebSocketServer } from 'ws';
import { 
	MESSAGE_TYPES, 
	parseMessage, 
	serializeMessage, 
	createErrorResponse,
	createPongMessage
} from './utils/protocol.js';
import { roomManager } from './utils/rooms.js';
import { authenticateWebSocket } from './middleware/auth.js';
import { handleAuth, handleDisconnect } from './handlers/auth.js';
import { 
	handleLoadConversations, 
	handleJoinConversation, 
	handleLeaveConversation,
	handleCreateConversation 
} from './handlers/conversations.js';
import { 
	handleSendMessage, 
	handleLoadMessages, 
	handleLoadMoreMessages 
} from './handlers/messages.js';
import {
	handleTypingStart,
	handleTypingStop,
	cleanupTypingIndicators
} from './handlers/typing.js';
import {
	handleCallOffer,
	handleCallAnswer,
	handleCallDecline,
	handleCallEnd,
	handleIceCandidate,
	handleSdpOffer,
	handleSdpAnswer
} from './handlers/voice-calls.js';
import {
	handleMLKEMCallOffer,
	handleMLKEMCallAnswer,
	handleMLKEMKeyRotation,
	handleMLKEMKeyRotationResponse
} from './handlers/ml-kem-voice-calls.js';
import { supabaseRealtimeBridge } from './supabase-realtime-bridge.js';

/**
 * WebSocket server class
 */
export class ChatWebSocketServer {
	constructor(options = {}) {
		this.port = options.port || 8080;
		this.server = options.wss || null; // Use external WebSocket server if provided
		this.noListen = options.noListen || false; // Don't create own server if true
		this.connections = new Map(); // WebSocket -> context mapping
		this.heartbeatInterval = null;
	}

	/**
	 * Start the WebSocket server
	 */
	start() {
		if (this.noListen) {
			// Don't create own server, just start heartbeat
			this.startHeartbeat();
			console.log('Chat WebSocket server initialized (using external server)');
			return;
		}

		this.server = new WebSocketServer({
			port: this.port,
			perMessageDeflate: false
		});

		console.log(`WebSocket server starting on port ${this.port}`);

		this.server.on('connection', (ws, request) => {
			this.handleConnection(ws, request);
		});

		this.server.on('error', (error) => {
			console.error('WebSocket server error:', error);
		});

		// Start heartbeat interval
		this.startHeartbeat();

		console.log(`WebSocket server started on port ${this.port}`);
	}

	/**
	 * Stop the WebSocket server
	 */
	stop() {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}

		if (this.server && !this.noListen) {
			this.server.close();
			this.server = null;
		}

		console.log('WebSocket server stopped');
	}

	/**
	 * Handle new WebSocket connection
	 * @param {WebSocket} ws - WebSocket connection
	 * @param {Object} request - HTTP upgrade request
	 */
	async handleConnection(ws, request) {
		console.log('🔌 [SERVER] ==================== NEW CONNECTION ====================');
		console.log('🔌 [SERVER] Connection details:', {
			url: request.url,
			headers: {
				origin: request.headers.origin,
				userAgent: request.headers['user-agent']?.substring(0, 50) + '...',
				authorization: request.headers.authorization ? 'Present' : 'Missing'
			},
			remoteAddress: request.socket.remoteAddress
		});

		// Create connection context
		const context = {
			authenticated: false,
			user: null,
			supabase: null,
			lastPing: Date.now()
		};

		this.connections.set(ws, context);
		console.log('🔌 [SERVER] Connection context created, total connections:', this.connections.size);

		// Set up message handler
		ws.on('message', (data) => {
			this.handleMessage(ws, data, context);
		});

		// Set up close handler
		ws.on('close', () => {
			this.handleClose(ws, context);
		});

		// Set up error handler
		ws.on('error', (error) => {
			console.error('🔌 [SERVER] WebSocket connection error:', error);
			this.handleClose(ws, context);
		});

		// Set up ping/pong for connection health
		ws.on('pong', () => {
			context.lastPing = Date.now();
		});

		// Try to authenticate from request headers/query params
		console.log('🔌 [SERVER] Attempting initial authentication...');
		try {
			const authResult = await authenticateWebSocket(request);
			console.log('🔌 [SERVER] Initial auth result:', {
				success: authResult.success,
				hasUser: !!authResult.user,
				userId: authResult.user?.id || 'N/A'
			});
			
			if (authResult.success) {
				context.authenticated = true;
				context.user = authResult.user;
				// Note: We'll set up supabase client when needed in handlers
				roomManager.addUserConnection(ws, authResult.user.id);
				console.log('🔌 [SERVER] SUCCESS: WebSocket pre-authenticated for user:', authResult.user.id);
			} else {
				console.log('🔌 [SERVER] No initial authentication - will require AUTH message');
			}
		} catch (error) {
			console.error('🔌 [SERVER] Initial authentication error:', error);
		}
		
		console.log('🔌 [SERVER] ==================== CONNECTION SETUP COMPLETE ====================');
	}

	/**
	 * Handle incoming WebSocket message
	 * @param {WebSocket} ws - WebSocket connection
	 * @param {Buffer} data - Raw message data
	 * @param {Object} context - Connection context
	 */
	async handleMessage(ws, data, context) {
		console.log('📥 [SERVER] ==================== MESSAGE RECEIVED ====================');
		console.log('📥 [SERVER] Raw data length:', data.length);
		console.log('📥 [SERVER] Context state:', {
			authenticated: context.authenticated,
			hasUser: !!context.user,
			userId: context.user?.id || 'N/A',
			hasSupabase: !!context.supabase
		});
		
		try {
			const rawMessage = data.toString();
			console.log('📥 [SERVER] Raw message:', rawMessage);
			
			const message = parseMessage(rawMessage);
			console.log('📥 [SERVER] Parsed message:', {
				hasMessage: !!message,
				type: message?.type || 'N/A',
				requestId: message?.requestId || 'N/A',
				hasPayload: !!message?.payload,
				payloadKeys: message?.payload ? Object.keys(message.payload) : []
			});
			
			if (!message) {
				console.error('📥 [SERVER] ERROR: Invalid message format');
				const errorResponse = createErrorResponse(
					null,
					'Invalid message format',
					'INVALID_MESSAGE'
				);
				ws.send(serializeMessage(errorResponse));
				return;
			}

			console.log(`📥 [SERVER] Processing message type: ${message.type}`);

			// Handle different message types
			switch (message.type) {
				case MESSAGE_TYPES.AUTH:
					console.log('📥 [SERVER] Routing to AUTH handler');
					await handleAuth(ws, message, context);
					break;

				case MESSAGE_TYPES.LOAD_CONVERSATIONS:
					console.log('📥 [SERVER] Routing to LOAD_CONVERSATIONS handler');
					await handleLoadConversations(ws, message, context);
					break;

				case MESSAGE_TYPES.JOIN_CONVERSATION:
					console.log('📥 [SERVER] Routing to JOIN_CONVERSATION handler');
					await handleJoinConversation(ws, message, context);
					break;

				case MESSAGE_TYPES.LEAVE_CONVERSATION:
					console.log('📥 [SERVER] Routing to LEAVE_CONVERSATION handler');
					await handleLeaveConversation(ws, message, context);
					break;

				case MESSAGE_TYPES.CREATE_CONVERSATION:
					console.log('📥 [SERVER] Routing to CREATE_CONVERSATION handler');
					await handleCreateConversation(ws, message, context);
					break;

				case MESSAGE_TYPES.SEND_MESSAGE:
					console.log('📥 [SERVER] Routing to SEND_MESSAGE handler');
					await handleSendMessage(ws, message, context);
					break;

				case MESSAGE_TYPES.LOAD_MESSAGES:
					console.log('📥 [SERVER] Routing to LOAD_MESSAGES handler');
					await handleLoadMessages(ws, message, context);
					break;

				case MESSAGE_TYPES.LOAD_MORE_MESSAGES:
					console.log('📥 [SERVER] Routing to LOAD_MORE_MESSAGES handler');
					await handleLoadMoreMessages(ws, message, context);
					break;

				case MESSAGE_TYPES.TYPING_START:
					console.log('📥 [SERVER] Routing to TYPING_START handler');
					await handleTypingStart(ws, message, context);
					break;

				case MESSAGE_TYPES.TYPING_STOP:
					console.log('📥 [SERVER] Routing to TYPING_STOP handler');
					await handleTypingStop(ws, message, context);
					break;

				case MESSAGE_TYPES.PING:
					console.log('📥 [SERVER] Handling PING message');
					const pongResponse = createPongMessage(message.requestId);
					ws.send(serializeMessage(pongResponse));
					context.lastPing = Date.now();
					break;

				case MESSAGE_TYPES.CALL_OFFER:
					console.log('📥 [SERVER] Routing to CALL_OFFER handler');
					await handleCallOffer(ws, message, context);
					break;

				case MESSAGE_TYPES.CALL_ANSWER:
					console.log('📥 [SERVER] Routing to CALL_ANSWER handler');
					await handleCallAnswer(ws, message, context);
					break;

				case MESSAGE_TYPES.CALL_DECLINE:
					console.log('📥 [SERVER] Routing to CALL_DECLINE handler');
					await handleCallDecline(ws, message, context);
					break;

				case MESSAGE_TYPES.CALL_END:
					console.log('📥 [SERVER] Routing to CALL_END handler');
					await handleCallEnd(ws, message, context);
					break;

				case MESSAGE_TYPES.CALL_ICE_CANDIDATE:
					console.log('📥 [SERVER] Routing to CALL_ICE_CANDIDATE handler');
					await handleIceCandidate(ws, message, context);
					break;

				case MESSAGE_TYPES.CALL_SDP_OFFER:
					console.log('📥 [SERVER] Routing to CALL_SDP_OFFER handler');
					await handleSdpOffer(ws, message, context);
					break;

				case MESSAGE_TYPES.CALL_SDP_ANSWER:
					console.log('📥 [SERVER] Routing to CALL_SDP_ANSWER handler');
					await handleSdpAnswer(ws, message, context);
					break;

				// ML-KEM Post-Quantum Encrypted Calls
				case MESSAGE_TYPES.ML_KEM_CALL_OFFER:
					console.log('📥 [SERVER] Routing to ML_KEM_CALL_OFFER handler');
					await handleMLKEMCallOffer(ws, message, context);
					break;

				case MESSAGE_TYPES.ML_KEM_CALL_ANSWER:
					console.log('📥 [SERVER] Routing to ML_KEM_CALL_ANSWER handler');
					await handleMLKEMCallAnswer(ws, message, context);
					break;

				case MESSAGE_TYPES.ML_KEM_KEY_ROTATION:
					console.log('📥 [SERVER] Routing to ML_KEM_KEY_ROTATION handler');
					await handleMLKEMKeyRotation(ws, message, context);
					break;

				case MESSAGE_TYPES.ML_KEM_KEY_ROTATION_RESPONSE:
					console.log('📥 [SERVER] Routing to ML_KEM_KEY_ROTATION_RESPONSE handler');
					await handleMLKEMKeyRotationResponse(ws, message, context);
					break;

				default:
					console.error('📥 [SERVER] ERROR: Unknown message type:', message.type);
					const errorResponse = createErrorResponse(
						message.requestId,
						`Unknown message type: ${message.type}`,
						'UNKNOWN_MESSAGE_TYPE'
					);
					ws.send(serializeMessage(errorResponse));
					break;
			}

			console.log('📥 [SERVER] ==================== MESSAGE PROCESSING COMPLETE ====================');

		} catch (error) {
			console.error('📥 [SERVER] ==================== MESSAGE PROCESSING EXCEPTION ====================');
			console.error('📥 [SERVER] Exception details:', error);
			console.error('📥 [SERVER] Stack trace:', error.stack);
			const errorResponse = createErrorResponse(
				null,
				'Internal server error',
				'SERVER_ERROR'
			);
			ws.send(serializeMessage(errorResponse));
		}
	}

	/**
	 * Handle WebSocket connection close
	 * @param {WebSocket} ws - WebSocket connection
	 * @param {Object} context - Connection context
	 */
	async handleClose(ws, context) {
		console.log('WebSocket connection closed');

		try {
			// Handle disconnection cleanup
			await handleDisconnect(ws, context);

			// Clean up typing indicators
			if (context.user && context.supabase) {
				await cleanupTypingIndicators(context.user.id, context.supabase);
			}

			// Remove from connections
			this.connections.delete(ws);

		} catch (error) {
			console.error('Error handling WebSocket close:', error);
		}
	}

	/**
	 * Start heartbeat to detect dead connections
	 */
	startHeartbeat() {
		this.heartbeatInterval = setInterval(() => {
			const now = Date.now();
			const timeout = 60000; // 60 seconds

			for (const [ws, context] of this.connections.entries()) {
				if (now - context.lastPing > timeout) {
					console.log('Terminating dead WebSocket connection');
					ws.terminate();
					this.connections.delete(ws);
				} else {
					// Send ping
					ws.ping();
				}
			}

			// Clean up room manager
			roomManager.cleanup();

		}, 30000); // Check every 30 seconds
	}

	/**
	 * Get server statistics
	 * @returns {Object} Server statistics
	 */
	getStats() {
		return {
			totalConnections: this.connections.size,
			authenticatedConnections: Array.from(this.connections.values())
				.filter(ctx => ctx.authenticated).length,
			roomStats: roomManager.getStats()
		};
	}

	/**
	 * Broadcast message to all connected clients
	 * @param {Object} message - Message to broadcast
	 */
	broadcast(message) {
		const messageStr = serializeMessage(message);
		for (const [ws] of this.connections.entries()) {
			if (ws.readyState === ws.OPEN) {
				try {
					ws.send(messageStr);
				} catch (error) {
					console.error('Error broadcasting message:', error);
				}
			}
		}
	}
}

// Global server instance
let serverInstance = null;

/**
 * Start the WebSocket server
 * @param {Object} options - Server options
 * @returns {ChatWebSocketServer} Server instance
 */
export function startWebSocketServer(options = {}) {
	if (serverInstance) {
		console.warn('WebSocket server already running');
		return serverInstance;
	}

	serverInstance = new ChatWebSocketServer(options);
	serverInstance.start();
	return serverInstance;
}

/**
 * Stop the WebSocket server
 */
export function stopWebSocketServer() {
	if (serverInstance) {
		serverInstance.stop();
		serverInstance = null;
	}
}

/**
 * Get the current server instance
 * @returns {ChatWebSocketServer|null} Server instance or null
 */
export function getWebSocketServer() {
	return serverInstance;
}
