exports.up = function (knex) {
  return knex.schema
    .createTable('users', (table) => {
      table.increments('id').primary();
      table.string('email').nullable();
    })
    .createTable('sessions', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.date('date').notNullable();
      table.enu('type', ['run', 'strength']).notNullable();
      table.string('label');
      table.decimal('distance_miles', 5, 2).nullable();
      table.boolean('completed').notNullable().defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .createTable('milestones', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.date('date').notNullable();
      table.string('label').notNullable();
      table.enu('type', ['race', '5k', '10k', 'half', 'full', 'custom']).notNullable();
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('milestones')
    .dropTableIfExists('sessions')
    .dropTableIfExists('users');
};
