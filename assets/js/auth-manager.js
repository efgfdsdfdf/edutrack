/**
 * SupabaseAuthManager
 * Centralized authentication management for Student Companion
 */
const SupabaseAuthManager = {
    currentUser: null,
    userId: null,
    userEmail: null,
    supabaseClient: null,

    async init(client) {
        this.supabaseClient = client || (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
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
                this.currentUser = user;
                this.userId = user.id;
                this.userEmail = user.email;
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
        if (!this.supabaseClient) return;

        this.supabaseClient.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event);
            
            if (event === 'SIGNED_IN' && session) {
                this.currentUser = session.user;
                this.userId = session.user.id;
                this.userEmail = session.user.email;
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
        if (!this.supabaseClient) return false;
        try {
            // Save settings before logout if possible
            if (typeof SettingsManager !== 'undefined' && SettingsManager.saveSettings) {
                SettingsManager.saveSettings();
            }

            const { error } = await this.supabaseClient.auth.signOut();
            if (error) throw error;
            
            // Clear core session data
            localStorage.removeItem('currentUser');
            localStorage.removeItem('loginUser');
            localStorage.removeItem('user_id');
            localStorage.removeItem('supabase.auth.token'); // Supabase internal key
            
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
                window.location.href = 'index.html';
            }, 1500);
            
            return true;
        } catch (error) {
            console.error('Logout error:', error);
            if (typeof SettingsManager !== 'undefined' && SettingsManager.showNotification) {
                SettingsManager.showNotification('Error during logout', 'error');
            }
            return false;
        }
    }
};
