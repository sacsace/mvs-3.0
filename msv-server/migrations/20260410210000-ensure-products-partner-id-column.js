'use strict';

/**
 * products.partner_id — Sequelize 모델과 동기화.
 * 20260410200000 마이그레이션이 적용되지 않았거나 중간에 실패한 DB를 보정합니다.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS partner_id INTEGER REFERENCES partners(id) ON DELETE SET NULL;
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS products_partner_id_idx ON products(partner_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS products_partner_id_idx;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE products DROP COLUMN IF EXISTS partner_id;
    `);
  },
};
