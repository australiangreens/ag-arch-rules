import db from '../models/db/knexClient';
import knex from 'knex';

export const runQuery = () => [db, knex];
