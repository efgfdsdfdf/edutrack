
import os

file_path = r'c:\Users\ezeil\OneDrive\Desktop\first_code_black_pwa\homepage.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

profile_modal_html = """
<!-- Profile Modal -->
<div id="profileModal" class="tools-modal" aria-hidden="true" hidden style="display:none; visibility:hidden; opacity:0;">
  <div class="modal-panel">
    <div class="modal-header">
      <h2 class="modal-title">My Profile</h2>
      <button class="close-btn" type="button" data-close-modal="profileModal" onclick="window.closeHomepageModal && window.closeHomepageModal('profileModal')" aria-label="Close profile modal">
        <i class="fas fa-times"></i>
      </button>
    </div>
    
    <div class="profile-modal-content" style="padding: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="width: 100px; height: 100px; border-radius: 50%; background: var(--premium-gradient); margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; font-size: 3rem; color: #000; border: 4px solid var(--mature-accent);">
          <i class="fas fa-user"></i>
        </div>
        <h2 id="modalProfileUsername" style="color: #fff; margin-bottom: 5px;">Student</h2>
        <p id="modalProfileEmail" style="color: var(--muted-weak); font-size: 0.9rem;">No email provided</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; text-align: center;">
          <h4 style="color: var(--mature-accent); margin-bottom: 5px;">Member Since</h4>
          <p id="modalMemberSince" style="color: #fff; font-size: 0.9rem;">--</p>
        </div>
        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; text-align: center;">
          <h4 style="color: var(--mature-accent); margin-bottom: 5px;">Status</h4>
          <p style="color: #fff; font-size: 0.9rem;">Student</p>
        </div>
      </div>

      <div style="margin-bottom: 25px;">
        <h4 style="color: var(--muted-weak); margin-bottom: 10px; font-size: 0.8rem; text-transform: uppercase;">Bio</h4>
        <p id="modalBioText" style="color: #fff; font-size: 0.95rem; line-height: 1.5; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; border: 1px solid var(--border-soft);">No bio added yet.</p>
      </div>

      <div style="display: flex; gap: 10px;">
        <a href="profile.html" class="btn-premium" style="text-decoration: none; font-size: 0.9rem; padding: 12px;">
          <i class="fas fa-edit"></i> Full Profile
        </a>
        <button class="btn-outline" onclick="window.closeHomepageModal('profileModal')" style="font-size: 0.9rem; padding: 12px;">
          Close
        </button>
      </div>
    </div>
  </div>
</div>
"""

# Inject before Bottom Navigation
if '<!-- Bottom Navigation -->' in content:
    content = content.replace('<!-- Bottom Navigation -->', profile_modal_html + '\n  <!-- Bottom Navigation -->')

# Update Bottom Nav Profile Link
if '<a href="profile.html" class="nav-item">' in content:
    content = content.replace('<a href="profile.html" class="nav-item">', '<button type="button" class="nav-item nav-button" id="profileBtn" data-modal-target="profileModal" onclick="window.openHomepageModal && window.openHomepageModal(\'profileModal\')">')
    content = content.replace('Profile\n    </a>', 'Profile\n    </button>')

# Update JS to initialize profile modal
js_injection = """
        const profileBtn = document.getElementById('profileBtn');
        const profileModal = document.getElementById('profileModal');
        if (profileModal) appModals.push(profileModal);
"""

if 'const appModals = [toolsModal, settingsModal];' in content:
    content = content.replace('const appModals = [toolsModal, settingsModal];', 'const appModals = [toolsModal, settingsModal, document.getElementById(\'profileModal\')];')

# Add profile data loading
profile_js = """
      function updateProfileModalUI() {
        const userDataString = localStorage.getItem('currentUser') || localStorage.getItem('loginUser') || '';
        let username = 'Student';
        let email = 'No email provided';
        
        try {
          if (userDataString.startsWith('{')) {
            const user = JSON.parse(userDataString);
            username = user.username || user.firstName || 'Student';
            email = user.email || 'No email provided';
          } else if (userDataString) {
            username = userDataString;
          }
        } catch(e) {}

        const users = JSON.parse(localStorage.getItem('users') || '{}');
        const userData = users[username] || {};

        document.getElementById('modalProfileUsername').textContent = username;
        document.getElementById('modalProfileEmail').textContent = email;
        document.getElementById('modalMemberSince').textContent = userData.memberSince || new Date().toLocaleDateString();
        document.getElementById('modalBioText').textContent = userData.bio || 'No bio added yet.';
      }

      window.openHomepageModal = function(modalId) {
        if (modalId === 'profileModal') updateProfileModalUI();
        setModalState(modalId, true);
      };
"""

if 'window.openHomepageModal = function(modalId) {' in content:
    content = content.replace('window.openHomepageModal = function(modalId) {', profile_js + '\n      // Original open function replaced by version above')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Homepage updated with profile modal.")
