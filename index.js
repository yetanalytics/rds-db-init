const { Client } = require('pg')
var pgformat = require('pg-format');
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");
const cfnr = require('./cfn-response.js');

const client = new SSMClient({});
//helper to grab and parse secure strings from ssm
const getParam = async (path, secure) => {
   try {
        const command = new GetParameterCommand({ Name: path, WithDecryption: secure });
        const data = await client.send(command);
        return data.Parameter.Value;
    } catch (e)  {
        console.log(e);
        return null;
    }
};

//lambda takes db info from custom resolver and inits app db user idempotently
exports.handler = async (event, context) => {

    console.log("init db started");
    console.log(event);
    if (event.RequestType === 'Delete') {
        console.log("Deleting Custom Resource");
        return await cfnr.send(event, context, cfnr.SUCCESS, {});
    }
    const input = event.ResourceProperties;
    const appUser = input.DBUsername;
    const appPass = await getParam(input.DBPasswordPath, true);
    const db = input.DBName;
    const schema = input.DBSchema || 'public';
    const client = new Client({
        host: input.DBHost,
        port: input.DBPort,
        database: db,
        user: input.DBMasterUsername,
        password: await getParam(input.DBMasterPasswordPath, true),
        ssl: { rejectUnauthorized: false }
    });

    //needed to use a pg query formtter because you can't use identifiers as vars in prepared statements
    const checkQuery = 'SELECT FROM pg_catalog.pg_roles WHERE rolname = $1::text';
    const createQuery = pgformat('CREATE USER %I WITH ENCRYPTED PASSWORD %L', appUser, appPass);
    const grantDatabaseQuery = pgformat('GRANT ALL PRIVILEGES ON DATABASE %I TO %I', db, appUser);
    const grantSchemaQuery = pgformat('GRANT USAGE, CREATE ON SCHEMA %I TO %I', schema, appUser);

    try {
        console.log("Attempting database connection");
        await client.connect();
        console.log("Beginning db init transaction");
        await client.query("BEGIN");
        try {
            //check for admin user
            const userResponse = await client.query(checkQuery, [appUser]);
            console.log(userResponse);
            if (userResponse.rowCount < 1) {
                //create user
                console.log("Creating User");
                await client.query(createQuery);
            } else {
                console.log("User already exists.");
            }
            // Reconcile privileges on every create or update so existing users
            // receive grants added by newer versions of this function.
            console.log("Granting database privileges to user.");
            await client.query(grantDatabaseQuery);
            console.log("Granting schema privileges to user.");
            await client.query(grantSchemaQuery);
            await client.query("COMMIT");
        } catch(err) {
            console.log("db init transaction failed");
            console.error(err);
            await client.query("ROLLBACK");
            return await cfnr.send(event, context, cfnr.FAILED);
        }
        console.log("Finished db init");
        await cfnr.send(event, context, cfnr.SUCCESS, {
            dbAppUser: appUser,
            dbAppPass: appPass
        });
    } catch (err) {
        console.log("Error connecting to database");
        console.error(err);
        await cfnr.send(event, context, cfnr.FAILED);
    } finally {
        client.end();
    }
};
