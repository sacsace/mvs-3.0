'use strict';

/** company_gst_numbers·users 조회 성능 인덱스 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_company_gst_numbers_company_id
      ON company_gst_numbers(company_id);
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_users_company_id_status
      ON users(company_id, status);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_company_gst_numbers_company_id;
    `);
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_users_company_id_status;
    `);
  }
};
