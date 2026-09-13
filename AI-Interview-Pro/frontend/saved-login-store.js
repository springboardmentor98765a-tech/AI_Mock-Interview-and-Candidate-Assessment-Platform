(function exposeSavedLoginStore(root, factory) {
    const store = factory();
    if (typeof module === "object" && module.exports) module.exports = store;
    if (root) root.SavedLoginStore = store;
})(typeof window !== "undefined" ? window : globalThis, function createSavedLoginStore() {
    const KEY = "rememberedCredentialsList";
    const MAX_ACCOUNTS = 8;

    function normaliseAccount(account) {
        if (!account || typeof account !== "object") return null;
        const email = String(account.email || "").trim();
        const password = String(account.password || "");
        const role = String(account.role || "").trim().toLowerCase();
        if (!email || !["candidate", "recruiter", "admin"].includes(role)) return null;
        return { email, password, role };
    }

    function get(storage) {
        try {
            const parsed = JSON.parse(storage.getItem(KEY) || "[]");
            return Array.isArray(parsed) ? parsed.map(normaliseAccount).filter(Boolean).slice(0, MAX_ACCOUNTS) : [];
        } catch (error) {
            return [];
        }
    }

    function save(accounts, storage) {
        const cleaned = Array.isArray(accounts) ? accounts.map(normaliseAccount).filter(Boolean) : [];
        storage.setItem(KEY, JSON.stringify(cleaned.slice(0, MAX_ACCOUNTS)));
        return cleaned.slice(0, MAX_ACCOUNTS);
    }

    function upsert(email, password, role, storage) {
        const account = normaliseAccount({ email, password, role });
        if (!account) return get(storage);
        const accounts = get(storage).filter(item => item.email.toLowerCase() !== account.email.toLowerCase());
        accounts.unshift(account);
        return save(accounts, storage);
    }

    function remove(email, storage) {
        const target = String(email || "").trim().toLowerCase();
        return save(get(storage).filter(item => item.email.toLowerCase() !== target), storage);
    }

    function clear(storage) {
        return save([], storage);
    }

    return { KEY, MAX_ACCOUNTS, get, save, upsert, remove, clear };
});
