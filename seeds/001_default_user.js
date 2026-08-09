exports.seed = async function (knex) {
  await knex('milestones').del();
  await knex('sessions').del();
  await knex('users').del();

  await knex('users').insert([
    { id: 1, email: null },
  ]);
};
