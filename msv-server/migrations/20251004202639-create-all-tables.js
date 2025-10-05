'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // 1. Tenants 테이블
    await queryInterface.createTable('tenants', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      domain: {
        type: Sequelize.STRING(255),
        unique: true
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'suspended'),
        defaultValue: 'active'
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // 2. Menus 테이블
    await queryInterface.createTable('menus', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      path: {
        type: Sequelize.STRING(255)
      },
      icon: {
        type: Sequelize.STRING(100)
      },
      parent_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'menus',
          key: 'id'
        }
      },
      order: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      tenant_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'tenants',
          key: 'id'
        }
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // 3. UserPermissions 테이블
    await queryInterface.createTable('user_permissions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      menu_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'menus',
          key: 'id'
        }
      },
      can_read: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      can_write: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      can_delete: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // 4. SalesOpportunities 테이블
    await queryInterface.createTable('sales_opportunities', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT
      },
      value: {
        type: Sequelize.DECIMAL(15, 2)
      },
      stage: {
        type: Sequelize.ENUM('lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'),
        defaultValue: 'lead'
      },
      probability: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      expected_close_date: {
        type: Sequelize.DATE
      },
      customer_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'customers',
          key: 'id'
        }
      },
      tenant_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'tenants',
          key: 'id'
        }
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // 5. Contracts 테이블
    await queryInterface.createTable('contracts', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      contract_number: {
        type: Sequelize.STRING(100),
        unique: true
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT
      },
      value: {
        type: Sequelize.DECIMAL(15, 2)
      },
      start_date: {
        type: Sequelize.DATE
      },
      end_date: {
        type: Sequelize.DATE
      },
      status: {
        type: Sequelize.ENUM('draft', 'active', 'expired', 'terminated'),
        defaultValue: 'draft'
      },
      customer_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'customers',
          key: 'id'
        }
      },
      tenant_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'tenants',
          key: 'id'
        }
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // 6. SupportTickets 테이블
    await queryInterface.createTable('support_tickets', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      ticket_number: {
        type: Sequelize.STRING(100),
        unique: true
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
        defaultValue: 'medium'
      },
      status: {
        type: Sequelize.ENUM('open', 'in_progress', 'resolved', 'closed'),
        defaultValue: 'open'
      },
      customer_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'customers',
          key: 'id'
        }
      },
      assigned_to: {
        type: Sequelize.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      tenant_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'tenants',
          key: 'id'
        }
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // 7. SupportResponses 테이블
    await queryInterface.createTable('support_responses', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      ticket_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'support_tickets',
          key: 'id'
        }
      },
      user_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      is_internal: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // 8. InvoiceItems 테이블
    await queryInterface.createTable('invoice_items', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      invoice_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'invoices',
          key: 'id'
        }
      },
      product_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'products',
          key: 'id'
        }
      },
      description: {
        type: Sequelize.STRING(255)
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      unit_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      total_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // 9. Projects 테이블
    await queryInterface.createTable('projects', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT
      },
      start_date: {
        type: Sequelize.DATE
      },
      end_date: {
        type: Sequelize.DATE
      },
      status: {
        type: Sequelize.ENUM('planning', 'active', 'on_hold', 'completed', 'cancelled'),
        defaultValue: 'planning'
      },
      budget: {
        type: Sequelize.DECIMAL(15, 2)
      },
      customer_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'customers',
          key: 'id'
        }
      },
      tenant_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'tenants',
          key: 'id'
        }
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // 10. Payrolls 테이블
    await queryInterface.createTable('payrolls', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      employee_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      pay_period_start: {
        type: Sequelize.DATE,
        allowNull: false
      },
      pay_period_end: {
        type: Sequelize.DATE,
        allowNull: false
      },
      basic_salary: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      overtime_pay: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      bonus: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      deductions: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      net_pay: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('draft', 'approved', 'paid'),
        defaultValue: 'draft'
      },
      tenant_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'tenants',
          key: 'id'
        }
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // 11. InventoryTransactions 테이블
    await queryInterface.createTable('inventory_transactions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      product_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'products',
          key: 'id'
        }
      },
      transaction_type: {
        type: Sequelize.ENUM('in', 'out', 'adjustment', 'transfer'),
        allowNull: false
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      unit_cost: {
        type: Sequelize.DECIMAL(10, 2)
      },
      total_cost: {
        type: Sequelize.DECIMAL(10, 2)
      },
      reference_type: {
        type: Sequelize.STRING(50)
      },
      reference_id: {
        type: Sequelize.INTEGER
      },
      notes: {
        type: Sequelize.TEXT
      },
      tenant_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'tenants',
          key: 'id'
        }
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });
  },

  async down (queryInterface, Sequelize) {
    // 테이블 삭제 (역순으로)
    await queryInterface.dropTable('inventory_transactions');
    await queryInterface.dropTable('payrolls');
    await queryInterface.dropTable('projects');
    await queryInterface.dropTable('invoice_items');
    await queryInterface.dropTable('support_responses');
    await queryInterface.dropTable('support_tickets');
    await queryInterface.dropTable('contracts');
    await queryInterface.dropTable('sales_opportunities');
    await queryInterface.dropTable('user_permissions');
    await queryInterface.dropTable('menus');
    await queryInterface.dropTable('tenants');
  }
};
