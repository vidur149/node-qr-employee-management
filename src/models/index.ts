import * as fs from "fs";
import * as path from "path";
import * as Sequelize from "sequelize";

export const dbInit = (): any => {
  const basename = path.basename(module.filename);
  let config = require(path.join(
    __dirname,
    `../config/config.` + process.env.NODE_ENV + `.json`
  ));
  let db: any = {};
  // new sequelize instance
  let sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    {
      host: config.host,
      dialect: config.dialect,
      pool: config.pool,
      logging: false
    }
  );
  /**
   * Looks for js files in the directory and adds a key with the name of a model to the db object.
   */
  fs.readdirSync(__dirname)
    .filter(file => {
      return (
        file.indexOf(".") !== 0 && file !== basename && file.slice(-3) === ".js"
      );
    })
    .forEach(file => {
      let model = sequelize["import"](path.join(__dirname, file));
      db[model["name"]] = model;
      let name = String(model.name);
    });

  /**
   * Checks if a model in db has a class method named associate.
   * If present call the method to define associations amongst models.
   */
  for (let model in db) {
    if (db.hasOwnProperty(model)) {
      try {
        db[model].associate(db);
      } catch (error) {
        console.log(model + " model doesnt have any assosciations");
      }
    }
  }
  // db.process
  //   .bulkCreate(processes.map(process => ({ name: process })))
  //   .then(() => console.log("processes created"))
  //   .catch(err => console.log("processes already exists"));

  sequelize.sync();
  // sequelize.sync({ force: true });

  db["sequelize"] = sequelize;
  return db;
};
