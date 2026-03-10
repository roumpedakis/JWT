class Dictionary {
    static entries = {
        missing_client_id_header: { code: 'E400001', el: 'Λείπει το client_id header', en: 'Missing client_id header' },
        missing_aud: { code: 'E400002', el: 'Λείπει το aud', en: 'Missing aud' },
        missing_hash: { code: 'E400003', el: 'Λείπει το hash', en: 'Missing hash' },
        missing_code_or_user: { code: 'E400004', el: 'Λείπει το code ή το user', en: 'Missing code or user' },
        missing_user_or_aud: { code: 'E400005', el: 'Λείπει το user ή το aud', en: 'Missing user or aud' },
        missing_code_or_pin: { code: 'E400006', el: 'Λείπει το code ή το pin', en: 'Missing code or pin' },
        missing_refresh_token: { code: 'E400007', el: 'Λείπει το refresh token', en: 'Missing refresh token' },
        invalid_grant_expected_code_or_sms: { code: 'E400008', el: 'Μη έγκυρο grant, αναμένεται code ή SMS', en: 'Invalid grant, expected code or SMS' },
        no_mobile_number_set: { code: 'E400009', el: 'Δεν έχει οριστεί αριθμός κινητού', en: 'No mobile number set' },
        missing_id_param: { code: 'E400010', el: 'Λείπει το id parameter', en: 'Missing id parameter' },
        missing_username: { code: 'E400011', el: 'Λείπει το username', en: 'Missing username' },
        missing_client_fields: { code: 'E400012', el: 'Λείπουν υποχρεωτικά πεδία client', en: 'Missing required client fields' },
        invalid_pagination_params: { code: 'E400013', el: 'Μη έγκυρες παράμετροι pagination', en: 'Invalid pagination parameters' },
        invalid_sort_params: { code: 'E400014', el: 'Μη έγκυρες παράμετροι ταξινόμησης', en: 'Invalid sorting parameters' },
        invalid_boolean_filter: { code: 'E400015', el: 'Μη έγκυρη boolean παράμετρος φίλτρου', en: 'Invalid boolean filter parameter' },
        invalid_username_format: { code: 'E400016', el: 'Μη έγκυρη μορφή username', en: 'Invalid username format' },
        invalid_mobile_format: { code: 'E400017', el: 'Μη έγκυρη μορφή κινητού', en: 'Invalid mobile format' },
        invalid_is_active_type: { code: 'E400018', el: 'Το is_active πρέπει να είναι boolean', en: 'is_active must be boolean' },
        invalid_client_id_format: { code: 'E400019', el: 'Το client_id πρέπει να είναι 8 αλφαριθμητικοί χαρακτήρες', en: 'client_id must be 8 alphanumeric characters' },
        invalid_client_secret_format: { code: 'E400020', el: 'Το client_secret πρέπει να είναι 16 χαρακτήρες', en: 'client_secret must be 16 characters' },
        invalid_exp_value: { code: 'E400021', el: 'Οι χρόνοι λήξης πρέπει να είναι θετικοί ακέραιοι', en: 'Expiration values must be positive integers' },
        invalid_hash_format: { code: 'E400022', el: 'Μη έγκυρη μορφή hash', en: 'Invalid hash format' },
        invalid_code_format: { code: 'E400023', el: 'Μη έγκυρη μορφή code', en: 'Invalid code format' },
        invalid_pin_format: { code: 'E400024', el: 'Μη έγκυρη μορφή PIN', en: 'Invalid PIN format' },

        invalid_client_id: { code: 'E403001', el: 'Μη έγκυρο client_id', en: 'Invalid client_id' },
        invalid_hash: { code: 'E403002', el: 'Μη έγκυρο hash', en: 'Invalid hash' },
        user_not_found: { code: 'E403003', el: 'Ο χρήστης δεν βρέθηκε', en: 'User not found' },
        admin_auth_required: { code: 'E403004', el: 'Απαιτείται Basic authentication', en: 'Basic authentication required' },
        admin_auth_invalid: { code: 'E403005', el: 'Μη έγκυρα admin credentials', en: 'Invalid admin credentials' },
        user_already_exists: { code: 'E409001', el: 'Ο χρήστης υπάρχει ήδη', en: 'User already exists' },
        client_already_exists: { code: 'E409002', el: 'Το client υπάρχει ήδη', en: 'Client already exists' },

        invalid_code_or_pin: { code: 'E401001', el: 'Μη έγκυρο code/pin', en: 'Invalid code/pin' },
        code_expired: { code: 'E401002', el: 'Το code έληξε', en: 'Code expired' },
        code_not_linked_to_user: { code: 'E401003', el: 'Το code δεν έχει συνδεθεί με χρήστη ακόμα', en: 'Code is not linked to a user yet' },
        invalid_token: { code: 'E401004', el: 'Μη έγκυρο token', en: 'Invalid token' },
        token_expired: { code: 'E401005', el: 'Το token έληξε', en: 'Token expired' },
        token_not_found: { code: 'E401006', el: 'Το token δεν βρέθηκε', en: 'Token not found' },
        agent_not_found: { code: 'E401007', el: 'Ο agent δεν βρέθηκε', en: 'Agent not found' },
        missing_access_token: { code: 'E401008', el: 'Λείπει το access token', en: 'Missing access token' },
        insufficient_scope: { code: 'E401009', el: 'Μη επαρκές scope', en: 'Insufficient scope' },
        token_not_found_or_revoked: { code: 'E401010', el: 'Το token δεν βρέθηκε ή έχει ανακληθεί', en: 'Token not found or revoked' },
        code_not_found: { code: 'E401011', el: 'Το code δεν βρέθηκε', en: 'Code not found' },
        user_not_found_admin: { code: 'E404001', el: 'Ο χρήστης δεν βρέθηκε', en: 'User not found' },
        client_not_found: { code: 'E404002', el: 'Το client δεν βρέθηκε', en: 'Client not found' },

        failed_generate_unique_code: { code: 'E500001', el: 'Αποτυχία δημιουργίας μοναδικού code', en: 'Failed to generate unique code' },
        failed_generate_unique_pin: { code: 'E500002', el: 'Αποτυχία δημιουργίας μοναδικού PIN', en: 'Failed to generate unique PIN' },
        failed_send_sms: { code: 'E500003', el: 'Αποτυχία αποστολής SMS', en: 'Failed to send SMS' },
        failed_create_tokens: { code: 'E500004', el: 'Αποτυχία δημιουργίας tokens', en: 'Failed to create tokens' },
        failed_create_access_token: { code: 'E500005', el: 'Αποτυχία δημιουργίας access token', en: 'Failed to create access token' },
        internal_server_error: { code: 'E500999', el: 'Εσωτερικό σφάλμα διακομιστή', en: 'Internal server error' },

        ok_code_generated: { code: 'S200001', el: 'Το code δημιουργήθηκε επιτυχώς', en: 'Code generated successfully' },
        ok_code_assigned: { code: 'S200002', el: 'Το code συνδέθηκε με χρήστη', en: 'Code assigned to user' },
        ok_sms_sent: { code: 'S200003', el: 'Το SMS στάλθηκε επιτυχώς', en: 'SMS sent successfully' },
        ok_tokens_issued: { code: 'S200004', el: 'Τα tokens εκδόθηκαν επιτυχώς', en: 'Tokens issued successfully' },
        ok_access_refreshed: { code: 'S200005', el: 'Το access token ανανεώθηκε', en: 'Access token refreshed' },
        ok_admin_codes_listed: { code: 'S200006', el: 'Τα codes φορτώθηκαν επιτυχώς', en: 'Codes loaded successfully' },
        ok_admin_code_updated: { code: 'S200007', el: 'Το code ενημερώθηκε επιτυχώς', en: 'Code updated successfully' },
        ok_admin_code_deleted: { code: 'S200008', el: 'Το code διαγράφηκε επιτυχώς', en: 'Code deleted successfully' },
        ok_admin_tokens_listed: { code: 'S200009', el: 'Τα tokens φορτώθηκαν επιτυχώς', en: 'Tokens loaded successfully' },
        ok_admin_token_updated: { code: 'S200010', el: 'Το token ενημερώθηκε επιτυχώς', en: 'Token updated successfully' },
        ok_admin_token_revoked: { code: 'S200011', el: 'Το token ανακλήθηκε επιτυχώς', en: 'Token revoked successfully' },
        ok_admin_token_deleted: { code: 'S200012', el: 'Το token διαγράφηκε επιτυχώς', en: 'Token deleted successfully' },
        ok_admin_users_listed: { code: 'S200013', el: 'Οι χρήστες φορτώθηκαν επιτυχώς', en: 'Users loaded successfully' },
        ok_admin_user_created: { code: 'S200014', el: 'Ο χρήστης δημιουργήθηκε επιτυχώς', en: 'User created successfully' },
        ok_admin_user_updated: { code: 'S200015', el: 'Ο χρήστης ενημερώθηκε επιτυχώς', en: 'User updated successfully' },
        ok_admin_user_deleted: { code: 'S200016', el: 'Ο χρήστης διαγράφηκε επιτυχώς', en: 'User deleted successfully' },
        ok_admin_clients_listed: { code: 'S200017', el: 'Τα clients φορτώθηκαν επιτυχώς', en: 'Clients loaded successfully' },
        ok_admin_client_created: { code: 'S200018', el: 'Το client δημιουργήθηκε επιτυχώς', en: 'Client created successfully' },
        ok_admin_client_updated: { code: 'S200019', el: 'Το client ενημερώθηκε επιτυχώς', en: 'Client updated successfully' },
        ok_admin_client_deleted: { code: 'S200020', el: 'Το client διαγράφηκε επιτυχώς', en: 'Client deleted successfully' }
    };

    static normalizeLang(lang) {
        const value = String(lang || '').trim().toLowerCase();
        if (value.startsWith('en')) return 'en';
        return 'el';
    }

    static fromRequest(req) {
        const lang =
            (req.query && req.query.lang) ||
            (req.body && req.body.lang) ||
            req.headers['lang'] ||
            req.headers['accept-language'];
        return this.normalizeLang(lang);
    }

    static get(key, lang = 'el') {
        const currentLang = this.normalizeLang(lang);
        const entry = this.entries[key];
        if (!entry) return { code: 'E500000', message: key };
        return { code: entry.code, message: currentLang === 'en' ? entry.en : entry.el };
    }
}

module.exports = Dictionary;
