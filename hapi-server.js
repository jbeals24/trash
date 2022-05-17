// Knex
const knex = require("knex")({
  client: "pg",
  connection: {
    host: "pg.cse.taylor.edu", // PostgreSQL server
    user: "jada_bonnett", // Your user name
    password: "dizafuqi", // Your password
    database: "jada_bonnett", // Your database name
  },
});

// Objection
const objection = require("objection");
objection.Model.knex(knex);

// Models
const User = require("./models/User");

// Hapi
const Joi = require("@hapi/joi"); // Input validation
const Hapi = require("@hapi/hapi"); // Server

const server = Hapi.server({
  host: "localhost",
  port: 3000,
  routes: {
    cors: true,
  },
});

async function init() {
  // Show routes at startup.
  await server.register(require("blipp"));

  // Output logging information.
  await server.register({
    plugin: require("hapi-pino"),
    options: {
      prettyPrint: true,
    },
  });

  // Configure routes.
  server.route([
    {
      method: "POST",
      path: "/users",
      config: {
        description: "Sign up for an account",
        validate: {
          payload: Joi.object({
            firstName: Joi.string().required(),
            lastName: Joi.string().required(),
            email: Joi.string().email().required(),
            password: Joi.string().required(),
          }),
        },
      },
      handler: async (request, h) => {
        const existingAccount = await User.query()
          .where("email", request.payload.email)
          .first();
        if (existingAccount) {
          return {
            ok: false,
            msge: `Account with email '${request.payload.email}' is already in use`,
          };
        }

        const newUser = await User.query().insert({
          firstName: request.payload.firstName,
          lastName: request.payload.lastName,
          email: request.payload.email,
          password: request.payload.password,
        });

        if (newUser) {
          return {
            ok: true,
            msge: `Created user '${request.payload.email}'`,
          };
        } else {
          return {
            ok: false,
            msge: `Couldn't create user with email '${request.payload.email}'`,
          };
        }
      },
    },

    {
      method: "GET",
      path: "/users",
      config: {
        description: "Retrieve all users",
      },
      handler: (request, h) => {
        return User.query();
      },
    },
//
    {
      method: "DELETE",
      path: "/users/{id}",
      config: {
        description: "Delete a user",
      },
      handler: (request, h) => {
        return User.query()
          .deleteById(request.params.id)
          .then((rowsDeleted) => {
            if (rowsDeleted === 1) {
              return {
                ok: true,
                msge: `Deleted user with ID '${request.params.id}'`,
              };
            } else {
              return {
                ok: false,
                msge: `Couldn't delete user with ID '${request.params.id}'`,
              };
            }
          });
      },
    },

    {
      method: "POST",
      path: "/login",
      config: {
        description: "Log in",
        validate: {
          payload: Joi.object({
            email: Joi.string().email().required(),
            password: Joi.string().min(8).required(),
          }),
        },
      },
      handler: async (request, h) => {
        const user = await User.query()
          .where("email", request.payload.email)
          .first();
        if (
          user &&
          (await user.verifyPassword(request.payload.password))
        ) {
          return {
            ok: true,
            msge: `Logged in successfully as '${request.payload.email}'`,
            details: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
            },
          };
        } else {
          return {
            ok: false,
            msge: "Invalid email or password",
          };
        }
      },
    }
    


  ]);

  // Start the server.
  await server.start();

};

// Go!
init();
