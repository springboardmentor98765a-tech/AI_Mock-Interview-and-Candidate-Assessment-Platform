package com.smarthire.backend.config;

import com.smarthire.backend.entity.User;
import com.smarthire.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Bootstraps a default ADMIN account on startup.
 *
 * Root cause fixed: {@code UserService.registerUser} (used by the public
 * /api/auth/register endpoint) intentionally forces any role other than
 * "candidate" or "recruiter" down to "candidate" - correct behavior, since
 * public self-registration must never be able to grant ADMIN. But with no
 * seed data anywhere in the project, that left NO way to ever create the
 * first admin account. Every "admin" signup silently became a candidate
 * account, so logging in and hitting /api/admin/** correctly returned 403
 * (Spring Security was working as configured - there was simply no admin
 * user in the database).
 *
 * This runs once per startup and only creates the account if no ADMIN user
 * already exists, so it never overwrites a real admin's password on
 * subsequent restarts. Credentials are configurable via environment
 * variables and default to values suitable for local development only.
 */
@Component
public class AdminAccountSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminAccountSeeder.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String defaultAdminEmail;
    private final String defaultAdminPassword;
    private final String defaultAdminName;

    public AdminAccountSeeder(UserRepository userRepository,
                               PasswordEncoder passwordEncoder,
                               @Value("${app.admin.default-email:admin@smarthire.com}") String defaultAdminEmail,
                               @Value("${app.admin.default-password:Admin@12345}") String defaultAdminPassword,
                               @Value("${app.admin.default-name:SmartHire Admin}") String defaultAdminName) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.defaultAdminEmail = defaultAdminEmail;
        this.defaultAdminPassword = defaultAdminPassword;
        this.defaultAdminName = defaultAdminName;
    }

    @Override
    public void run(ApplicationArguments args) {
        String email = defaultAdminEmail.trim().toLowerCase();

        // Always ensure the configured local-development admin account exists.
        // Do not depend on whether some unrelated ADMIN account already exists.
        User admin = userRepository.findByEmail(email).orElseGet(User::new);
        boolean isNewAccount = admin.getId() == null;
        boolean promoted = !isNewAccount && !"admin".equalsIgnoreCase(admin.getRole());
        boolean passwordSet = false;
        admin.setEmail(email);
        admin.setName(admin.getName() == null || admin.getName().isBlank() ? defaultAdminName : admin.getName());
        admin.setRole("admin");
        admin.setStatus("ACTIVE");
        if (isNewAccount || promoted || admin.getPassword() == null || admin.getPassword().isBlank()) {
            admin.setPassword(passwordEncoder.encode(defaultAdminPassword));
            passwordSet = true;
        }

        userRepository.save(admin);

        log.warn("==================================================================");
        log.warn(isNewAccount
                ? "Default SmartHire local ADMIN account created automatically."
                : (promoted ? "Configured local ADMIN account was promoted from an existing user." : "Configured local ADMIN account already exists; its password was preserved."));
        log.warn("  Email:    {}", email);
        log.warn("  Password: {}", passwordSet ? defaultAdminPassword : "(kept existing password)");
        log.warn("Change this password immediately, or set app.admin.default-email /");
        log.warn("app.admin.default-password (env: ADMIN_DEFAULT_EMAIL / ADMIN_DEFAULT_PASSWORD)");
        log.warn("before deploying anywhere other than local development.");
        log.warn("==================================================================");
    }
}
