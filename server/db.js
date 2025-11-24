
const oracledb = require('oracledb');
require('dotenv').config();

// Auto-commit is essential for simple operations in this setup
oracledb.autoCommit = true;

const dbConfig = {
  user: process.env.DB_USER || "system",
  password: process.env.DB_PASSWORD || "oracle",
  connectString: process.env.DB_CONNECT_STRING || "localhost/XE"
};

async function initialize() {
  try {
    await oracledb.createPool(dbConfig);
    console.log("Pool de conexões Oracle iniciado com sucesso.");
  } catch (err) {
    console.error("Erro ao iniciar pool Oracle:", err);
    process.exit(1);
  }
}

async function close() {
  await oracledb.getPool().close(0);
}

function simpleExecute(statement, binds = [], opts = {}) {
  return new Promise(async (resolve, reject) => {
    let conn;

    opts.outFormat = oracledb.OUT_FORMAT_OBJECT;
    opts.autoCommit = true;

    try {
      conn = await oracledb.getConnection();
      const result = await conn.execute(statement, binds, opts);
      resolve(result);
    } catch (err) {
      reject(err);
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch (err) {
          console.error(err);
        }
      }
    }
  });
}

module.exports = {
  initialize,
  close,
  simpleExecute
};
