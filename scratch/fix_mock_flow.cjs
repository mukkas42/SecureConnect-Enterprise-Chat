const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/routes/api/auth/verify-sms/+server.js');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize to LF for easier matching
const original = content;
content = content.replace(/\r\n/g, '\n');

// ---------------------------------------------------------------
// The buggy block: if (!authUser) { createUser } else { updateUser }
// We replace it with a version that handles "already registered"
// ---------------------------------------------------------------
const oldBlock = `\t\t\t\tif (!authUser) {\n\t\t\t\t\tlogger.info('Mock user not found, creating new auth user');\n\t\t\t\t\tconst {\n\t\t\t\t\t\tdata: { user: newUser },\n\t\t\t\t\t\terror: createError\n\t\t\t\t\t} = await serviceSupabase.auth.admin.createUser({\n\t\t\t\t\t\tphone: phoneNumber,\n\t\t\t\t\t\tpassword: tempPassword,\n\t\t\t\t\t\tphone_confirm: true\n\t\t\t\t\t});\n\t\t\t\t\tif (createError) throw createError;\n\t\t\t\t\tverifyData = { user: newUser };\n\t\t\t\t} else {\n\t\t\t\t\tlogger.info('Mock user found, updating password');\n\t\t\t\t\tconst {\n\t\t\t\t\t\tdata: { user: updatedUser },\n\t\t\t\t\t\terror: updateError\n\t\t\t\t\t} = await serviceSupabase.auth.admin.updateUserById(authUser.id, {\n\t\t\t\t\t\tpassword: tempPassword,\n\t\t\t\t\t\tphone_confirm: true\n\t\t\t\t\t});\n\t\t\t\t\tif (updateError) throw updateError;\n\t\t\t\t\tverifyData = { user: updatedUser };\n\t\t\t\t}`;

const newBlock = `\t\t\t\tif (!authUser) {\n\t\t\t\t\tlogger.info('Mock user not found, attempting to create new auth user');\n\t\t\t\t\tconst {\n\t\t\t\t\t\tdata: { user: newUser },\n\t\t\t\t\t\terror: createError\n\t\t\t\t\t} = await serviceSupabase.auth.admin.createUser({\n\t\t\t\t\t\tphone: phoneNumber,\n\t\t\t\t\t\tpassword: tempPassword,\n\t\t\t\t\t\tphone_confirm: true\n\t\t\t\t\t});\n\t\t\t\t\tif (createError) {\n\t\t\t\t\t\t// Phone already exists in Auth but wasn't found above - do a fresh lookup\n\t\t\t\t\t\tif (\n\t\t\t\t\t\t\tcreateError.message?.includes('already registered') ||\n\t\t\t\t\t\t\tcreateError.message?.includes('already been registered') ||\n\t\t\t\t\t\t\tcreateError.status === 422\n\t\t\t\t\t\t) {\n\t\t\t\t\t\t\tlogger.warn('Phone already in Auth, falling back to full listUsers lookup');\n\t\t\t\t\t\t\tconst { data: listData2, error: listError2 } = await serviceSupabase.auth.admin.listUsers({ perPage: 1000 });\n\t\t\t\t\t\t\tif (!listError2 && listData2?.users) {\n\t\t\t\t\t\t\t\tauthUser = listData2.users.find((u) => u.phone === phoneNumber) || null;\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\tif (!authUser) {\n\t\t\t\t\t\t\t\tthrow new Error('Phone number is already registered but the account could not be found. Please try again.');\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t// authUser found - fall through to the update block below\n\t\t\t\t\t\t} else {\n\t\t\t\t\t\t\tthrow createError;\n\t\t\t\t\t\t}\n\t\t\t\t\t} else {\n\t\t\t\t\t\tverifyData = { user: newUser };\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t\tif (authUser && !verifyData?.user) {\n\t\t\t\t\tlogger.info('Mock user found (or recovered), updating password');\n\t\t\t\t\tconst {\n\t\t\t\t\t\tdata: { user: updatedUser },\n\t\t\t\t\t\terror: updateError\n\t\t\t\t\t} = await serviceSupabase.auth.admin.updateUserById(authUser.id, {\n\t\t\t\t\t\tpassword: tempPassword,\n\t\t\t\t\t\tphone_confirm: true\n\t\t\t\t\t});\n\t\t\t\t\tif (updateError) throw updateError;\n\t\t\t\t\tverifyData = { user: updatedUser };\n\t\t\t\t}`;

if (!content.includes(oldBlock)) {
  console.error('ERROR: Old block not found in file! Printing lines 175-205:');
  const lines = content.split('\n');
  console.log(lines.slice(175, 205).map((l, i) => `${176+i}: ${JSON.stringify(l)}`).join('\n'));
  process.exit(1);
}

const patched = content.replace(oldBlock, newBlock);

// Restore CRLF if the original had them
const finalContent = original.includes('\r\n') ? patched.replace(/\n/g, '\r\n') : patched;
fs.writeFileSync(filePath, finalContent, 'utf8');
console.log('SUCCESS: Fix applied to verify-sms/+server.js');
