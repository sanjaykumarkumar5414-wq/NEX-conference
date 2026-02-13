import { queryOne } from "../db/queryHelper.js";

export async function findRoomById(connection, roomId) {
  return queryOne(
    connection,
    "SELECT * FROM rooms WHERE id = ?",
    [roomId]
  );
}
