/* Tests that dropping the oplog is forbidden on standalone nodes with storage engines
 * that support the command "replSetResizeOplog". The support for this command is
 * provided only by the WiredTiger storage engine.
 * Therefore, attempts to drop the oplog when using these storage engines should fail.
 * Also, nodes running in a replica set will forbid dropping the oplog, but
 * for a different reason.
 * Note: We detect whether a storage engine supports the replSetResizeOplog command
 * by checking whether it supportsRecoveryTimestamp().
 *
 * @tags: [requires_persistence]
 */

(function() {
"use strict";

load("jstests/libs/storage_engine_utils.js");

const rt = new ReplSetTest({
    name: "drop_oplog_should_fail_if_storage_engine_supports_replSetResizeOplog_command",
    nodes: 1
});

// Start as a standalone node.
rt.start(0, {noReplSet: true});

let master = rt.getPrimary();
let localDB = master.getDB('local');

// Standalone nodes don't start with an oplog; create one. The size of the oplog doesn't
// matter. We are capping the oplog because some storage engines do not allow the creation
// of uncapped oplog collections.
assert.commandWorked(localDB.runCommand({create: 'oplog.rs', capped: true, size: 1000}));

if (storageEngineIsWiredTiger()) {
    const ret = assert.commandFailed(localDB.runCommand({drop: 'oplog.rs'}));
    assert.eq("can't drop oplog on storage engines that support replSetResizeOplog command",
              ret.errmsg);
} else {
    assert.commandWorked(localDB.runCommand({drop: 'oplog.rs'}));
}

rt.stopSet();
}());