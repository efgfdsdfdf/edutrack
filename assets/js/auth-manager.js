/**
 * SupabaseAuthManager
 * Centralized authentication management for Student Companion
 */
const SupabaseAuthManager = {
    currentUser: null,
    userId: null,
    userEmail: null,
    supabaseClient: null,
    authListenerReady: false,

    async init(client) {
        this.supabaseClient = client || window.supabaseClient || (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
        if (!this.supabaseClient && window.supabase && window.FirstCodeBlackSupabase) {
            this.supabaseClient = window.supabase.createClient(
                window.FirstCodeBlackSupabase.url,
                window.FirstCodeBlackSupabase.anonKey
            );
            window.supabaseClient = this.supabaseClient;
        }
        if (!this.supabaseClient) {
            console.error('SupabaseAuthManager: No supabaseClient provided or found.');
            return false;
        }

        try {
            const { data: { user }, error } = await this.supabaseClient.auth.getUser();
            
            if (error) {
                console.error('Error getting user:', error);
                return false;
            }
            
            if (user) {
                this.setCurrentUser(user);
                await this.enrichCurrentUserProfile();
                console.log('User authenticated:', this.userId);
                
                this.displayUserInfo();
                this.setupAuthListener();
                
                return true;
            } else {
                return false;
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
            return false;
        }
    },

    normalizeUser(user) {
        if (!user) return null;
        const emailPrefix = user.email ? user.email.split('@')[0] : '';
        return {
            id: user.id || '',
            email: user.email || '',
            username: user.user_metadata?.username || user.user_metadata?.user_name || emailPrefix,
            firstName: user.user_metadata?.first_name || user.user_metadata?.firstName || emailPrefix,
            lastName: user.user_metadata?.last_name || user.user_metadata?.lastName || '',
            profilePic: user.user_metadata?.profile_pic || user.user_metadata?.avatar_url || ''
        };
    },

    getStoredCurrentUser() {
        try {
            const raw = localStorage.getItem('currentUser') || localStorage.getItem('loginUser') || '';
            if (!raw || !raw.trim().startsWith('{')) return null;
            return JSON.parse(raw);
        } catch (error) {
            console.warn('Could not parse stored currentUser:', error);
            return null;
        }
    },

    isMeaningfulName(value) {
        if (typeof value !== 'string') return false;
        const cleaned = value.trim().toLowerCase();
        return Boolean(cleaned) && !['guest', 'student', 'unknown', 'undefined', 'null'].includes(cleaned);
    },

    firstMeaningfulName(...values) {
        const match = values.find(value => this.isMeaningfulName(value));
        return match ? match.trim() : '';
    },

    mergeUserWithStored(normalizedUser) {
        if (!normalizedUser) return null;

        const storedUser = this.getStoredCurrentUser();
        const isSameUser = storedUser && (
            (storedUser.id && normalizedUser.id && storedUser.id === normalizedUser.id) ||
            (storedUser.email && normalizedUser.email && storedUser.email === normalizedUser.email)
        );

        if (!isSameUser) return normalizedUser;

        return {
            ...normalizedUser,
            ...storedUser,
            id: normalizedUser.id || storedUser.id || '',
            email: normalizedUser.email || storedUser.email || '',
            username: this.firstMeaningfulName(normalizedUser.username, storedUser.username, normalizedUser.email ? normalizedUser.email.split('@')[0] : ''),
            firstName: this.firstMeaningfulName(storedUser.firstName, storedUser.first_name, normalizedUser.firstName, normalizedUser.first_name, normalizedUser.username),
            lastName: storedUser.lastName || normalizedUser.lastName || '',
            profilePic: storedUser.profilePic || normalizedUser.profilePic || ''
        };
    },

    setCurrentUser(user) {
        this.userId = user.id || null;
        this.userEmail = user.email || null;

        const normalizedUser = this.mergeUserWithStored(this.normalizeUser(user));
        if (normalizedUser) {
            this.currentUser = normalizedUser;
            localStorage.setItem('currentUser', JSON.stringify(normalizedUser));
            localStorage.setItem('loginUser', JSON.stringify(normalizedUser));
            localStorage.setItem('user_id', normalizedUser.id);
        }
        return normalizedUser;
    },

    async enrichCurrentUserProfile() {
        const user = this.getStoredCurrentUser();
        if (!user || !this.supabaseClient) return user;

        try {
            let profileData = null;

            if (user.id) {
                const { data: profilesRow } = await this.supabaseClient
                    .from('profiles')
                    .select('username, first_name, last_name, email, avatar_url, bio, created_at')
                    .eq('id', user.id)
                    .maybeSingle();
                profileData = profilesRow || null;

                if (!profileData) {
                    const { data: usersRow } = await this.supabaseClient
                        .from('users')
                        .select('username, first_name, last_name, email, created_at')
                        .eq('id', user.id)
                        .maybeSingle();
                    profileData = usersRow || null;
                }
            }

            if (!profileData && user.email) {
                const { data: profilesByEmail } = await this.supabaseClient
                    .from('profiles')
                    .select('username, first_name, last_name, email, avatar_url, bio, created_at')
                    .eq('email', user.email)
                    .maybeSingle();
                profileData = profilesByEmail || null;
            }

            if (!profileData) return user;

            const mergedUser = {
                ...user,
                email: profileData.email || user.email || '',
                username: profileData.username || user.username || '',
                firstName: profileData.first_name || user.firstName || '',
                lastName: profileData.last_name || user.lastName || '',
                profilePic: profileData.avatar_url || user.profilePic || '',
                bio: profileData.bio || user.bio || '',
                memberSince: profileData.created_at || user.memberSince || ''
            };

            this.currentUser = mergedUser;
            this.userId = mergedUser.id || this.userId;
            this.userEmail = mergedUser.email || this.userEmail;
            localStorage.setItem('currentUser', JSON.stringify(mergedUser));
            localStorage.setItem('loginUser', JSON.stringify(mergedUser));
            if (mergedUser.id) localStorage.setItem('user_id', mergedUser.id);
            return mergedUser;
        } catch (error) {
            console.warn('Could not enrich user profile:', error);
            return user;
        }
    },

    displayUserInfo() {
        const headerActions = document.querySelector('.header-actions');
        if (headerActions && this.userEmail) {
            const existingBadge = document.querySelector('.user-badge');
            if (existingBadge) existingBadge.remove();
            
            const userBadge = document.createElement('div');
            userBadge.className = 'user-badge';
            userBadge.innerHTML = `
                <span style="display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: rgba(123, 97, 255, 0.1); border-radius: 20px; font-size: 0.85rem;">
                    <i class="fas fa-user" style="color: var(--mature-accent);"></i>
                    <span style="color: var(--muted-text);">${this.userEmail.split('@')[0]}</span>
                </span>
            `;
            
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                headerActions.insertBefore(userBadge, logoutBtn);
            }
        }
    },

    setupAuthListener() {
        if (!this.supabaseClient || this.authListenerReady) return;
        this.authListenerReady = true;

        this.supabaseClient.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event);
            
            if (event === 'SIGNED_IN' && session) {
                this.setCurrentUser(session.user);
                this.enrichCurrentUserProfile().then(() => this.displayUserInfo());
                this.displayUserInfo();
                
                if (typeof SettingsManager !== 'undefined' && SettingsManager.showNotification) {
                    SettingsManager.showNotification('Welcome back!', 'success', 'Signed In');
                }
                
                // Trigger page-specific reloads if needed
                document.dispatchEvent(new CustomEvent('supabase-auth-changed', { detail: { event, session } }));
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                this.userId = null;
                this.userEmail = null;
                
                const userBadge = document.querySelector('.user-badge');
                if (userBadge) userBadge.remove();
                
                if (typeof SettingsManager !== 'undefined' && SettingsManager.showNotification) {
                    SettingsManager.showNotification('Signed out successfully', 'info', 'Signed Out');
                }
                
                document.dispatchEvent(new CustomEvent('supabase-auth-changed', { detail: { event, session } }));
            }
        });
    },

    async logout() {
        try {
            // Save settings before logout if possible
            if (typeof SettingsManager !== 'undefined' && SettingsManager.saveSettings) {
                SettingsManager.saveSettings();
            }

            if (!this.supabaseClient) {
                this.supabaseClient = window.supabaseClient || (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
                if (!this.supabaseClient && window.supabase && window.FirstCodeBlackSupabase) {
                    this.supabaseClient = window.supabase.createClient(
                        window.FirstCodeBlackSupabase.url,
                        window.FirstCodeBlackSupabase.anonKey
                    );
                    window.supabaseClient = this.supabaseClient;
                }
            }

            if (this.supabaseClient) {
                try {
                    await this.supabaseClient.auth.signOut();
                } catch (signOutError) {
                    console.warn('Supabase signOut error:', signOutError);
                }
            }
            
            // Clear core session data
            localStorage.removeItem('currentUser');
            localStorage.removeItem('loginUser');
            sessionStorage.removeItem('currentUser');
            localStorage.removeItem('user_id');

            const authKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('sb-') || key.includes('supabase.auth.token'))) {
                    authKeys.push(key);
                }
            }
            authKeys.forEach(key => localStorage.removeItem(key));
            
            // Clear user-specific data (notes, timetable, gpa)
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.includes('_notes') || key.includes('_timetable') || key.includes('_gpa') || key.includes('_settings'))) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            if (typeof SettingsManager !== 'undefined' && SettingsManager.showNotification) {
                SettingsManager.showNotification('Logged out successfully', 'success', 'Good bye!');
            }

            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1000);
            
            return true;
        } catch (error) {
            console.error('Logout error:', error);
            // Fallback clear anyway
            localStorage.removeItem('currentUser');
            localStorage.removeItem('loginUser');
            localStorage.removeItem('user_id');
            sessionStorage.removeItem('currentUser');
            window.location.href = 'login.html';
            return false;
        }
    }
};

window.SupabaseAuthManager = SupabaseAuthManager;
