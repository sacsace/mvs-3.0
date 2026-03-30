-- enum_vacations_vacation_type에 누락된 값 추가
-- postgres 슈퍼유저로 실행: psql -U postgres -d mvs -f scripts/add-vacation-enum-values.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'enum_vacations_vacation_type' AND e.enumlabel = 'study'
  ) THEN
    ALTER TYPE "enum_vacations_vacation_type" ADD VALUE 'study';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'enum_vacations_vacation_type' AND e.enumlabel = 'maternity'
  ) THEN
    ALTER TYPE "enum_vacations_vacation_type" ADD VALUE 'maternity';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'enum_vacations_vacation_type' AND e.enumlabel = 'paternity'
  ) THEN
    ALTER TYPE "enum_vacations_vacation_type" ADD VALUE 'paternity';
  END IF;
END
$$;
