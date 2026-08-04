-- ============================================================
--  SEED DATA — SmartHire Default Users
--  Passwords are bcrypt-hashed (cost factor 12)
--
--  Admin:     admin@smarthire.com     / Admin@123
--  Recruiter: recruiter@smarthire.com / Recruit@123
--  Candidate: candidate@smarthire.com / Cand@1234
--  Venu:      venu@smarthire.com      / Venu@1234
--
--  To regenerate hashes: node -e "const b=require('bcryptjs');
--    console.log(b.hashSync('Admin@123',12))"
-- ============================================================

INSERT INTO users (name, email, password_hash, role, auth_provider) VALUES
(
  'Admin User',
  'admin@smarthire.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VCG1s9DP.',
  'admin',
  'local'
),
(
  'Marcus Chen',
  'recruiter@smarthire.com',
  '$2a$12$Ei.V3lOkQ8YFiTfbfRGRleGKVg8B0HMDDi.RmxNKi4Uiee43wR3ym',
  'recruiter',
  'local'
),
(
  'Aisha Patel',
  'candidate@smarthire.com',
  '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'candidate',
  'local'
),
(
  'Venu',
  'venu@smarthire.com',
  '$2a$12$kfq0vUxFMqoqcTSH3yj0aO0X2ULLm.PbNPqP3TwMqjhYMPYD8h7v.',
  'admin',
  'local'
)
ON CONFLICT (email) DO NOTHING;
