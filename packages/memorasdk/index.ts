class Database {
  private static instance = new Database();

  private constructor() {}

  static getInstance(): Database {
    return Database.instance;
  }

  connect() {
    console.log("Connected");
  }
}
const db1 = Database.getInstance();
const db2 = Database.getInstance();

console.log(db1 === db2); // true