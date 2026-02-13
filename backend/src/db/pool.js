/**
 * Legacy pool.js - re-exports from config/db.js for backward compatibility
 * New code should import from ../../config/db.js directly
 */

export { pool, getConnection } from "../../config/db.js";
