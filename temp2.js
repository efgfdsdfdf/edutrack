
      // Supabase Configuration
      let supabase;
      try {
        if (window.FirstCodeBlackSupabase && window.supabase) {
          const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY } = window.FirstCodeBlackSupabase;
          supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
          window.supabaseClient = supabase; // Use a distinct name for the client to avoid confusion
        } else {
          console.error('Supabase library or config not found!');
        }
      } catch (err) {
        console.error('Error initializing Supabase:', err);
      }

      // Paystack Configuration for NGN Subscription Only
      const PAYSTACK_CONFIG = {
        publicKey: 'pk_live_06d473228ccbf3dfdd77ba93bfbdfc0dfc683205',
        secretKey: 'sk_live_765bc0c2f80128a85ecc1d220fef36014efd28e7', // You need to get this from your Paystack dashboard
        paymentLink: 'https://paystack.shop/pay/-xrk2381na', // Your Paystack payment page link
        callbackUrl: 'https://yourdomain.com/payment-callback.html', // Create a callback page
        plan: {
          amount: 850000, // ₦8,500 in kobo
          interval: 'monthly',
          currency: 'NGN'
        }
      };

      // Payment Verification System
      const PaymentVerifier = {
        // Verify payment with Paystack API
        verifyPayment: async function(transactionRef) {
          console.log('Verifying payment for reference:', transactionRef);
          
          try {
            // Show loading
            SubscriptionManager.showLoading('Verifying payment with Paystack...');
            
            // In a real implementation, you would call your backend here
            // For security, the secret key should NEVER be exposed in frontend code
            // This is just for demonstration - implement proper backend verification
            
            // Simulate API call to backend
            const response = await this.simulateBackendVerification(transactionRef);
            
            if (response.status) {
              console.log('Payment verified successfully:', response.data);
              return {
                success: true,
                data: response.data,
                message: 'Payment verified successfully'
              };
            } else {
              return {
                success: false,
                message: response.message || 'Payment verification failed'
              };
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            return {
              success: false,
              message: 'Verification error: ' + error.message
            };
          } finally {
            SubscriptionManager.hideLoading();
          }
        },

        // Simulate backend verification (Replace with actual backend API call)
        simulateBackendVerification: function(transactionRef) {
          return new Promise((resolve) => {
            setTimeout(() => {
              // Simulate different verification outcomes
              const random = Math.random();
              
              if (random < 0.9) {
                // Simulate successful payment verification
                resolve({
                  status: true,
                  message: 'Verification successful',
                  data: {
                    reference: transactionRef,
                    amount: 850000,
                    currency: 'NGN',
                    status: 'success',
                    paid_at: new Date().toISOString(),
                    metadata: {
                      email: SubscriptionManager.getUserEmail(),
                      plan: 'monthly_premium'
                    },
                    authorization: {
                      authorization_code: 'AUTH_' + Date.now(),
                      last4: Math.floor(1000 + Math.random() * 9000).toString(),
                      card_type: Math.random() > 0.5 ? 'visa' : 'mastercard'
                    }
                  }
                });
              } else if (random < 0.95) {
                // Simulate pending payment
                resolve({
                  status: false,
                  message: 'Payment is still pending. Please try again in a few minutes.'
                });
              } else {
                // Simulate failed payment
                resolve({
                  status: false,
                  message: 'Payment was not successful. Please ensure you have completed the payment.'
                });
              }
            }, 2000);
          });
        },

        // Generate unique reference for each user
        generateTransactionReference: function(username) {
          const timestamp = Date.now();
          const random = Math.random().toString(36).substr(2, 9).toUpperCase();
          return `STUDENTAI_${username}_${timestamp}_${random}`;
        },

        // Validate transaction reference format
        isValidTransactionRef: function(ref) {
          return ref && ref.length >= 10 && ref.includes('_');
        }
      };

      // Subscription Management
      const SubscriptionManager = {
        getCurrentUsername: function() {
          const rawUser = localStorage.getItem('currentUser') || localStorage.getItem('loginUser') || 'guest';
          if (rawUser && rawUser.trim && rawUser.trim().startsWith('{')) {
            try {
              const user = JSON.parse(rawUser);
              return user.username || user.firstName || (user.email ? user.email.split('@')[0] : '') || 'guest';
            } catch (error) {
              return 'guest';
            }
          }
          return rawUser || 'guest';
        },

        // Check if user is subscribed
        isSubscribed: function() {
          const username = this.getCurrentUsername();
          const userData = this.getUserData(username);
          const subscriptionData = userData.subscription || {};
          
          return subscriptionData.active === true && 
                subscriptionData.expiryDate && 
                new Date(subscriptionData.expiryDate) > new Date();
        },

        // Get subscription details
        getSubscriptionDetails: function() {
          const username = this.getCurrentUsername();
          const userData = this.getUserData(username);
          return userData.subscription || {};
        },

        // Get user data
        getUserData: function(username) {
          const users = JSON.parse(localStorage.getItem('users') || '{}');
          if (!users[username]) {
            users[username] = {
              password: '',
              notes: [],
              timetable: [],
              gpa: [],
              profile: {},
              notifications: [],
              subscription: {
                active: false,
                expiryDate: null,
                transactionRef: null,
                paymentMethod: null,
                planType: null,
                currency: 'NGN',
                cardDetails: null,
                transactionHistory: [],
                autoRenew: false,
                lastVerificationAttempt: null
              },
              pendingPayments: []
            };
            localStorage.setItem('users', JSON.stringify(users));
          }
          return users[username];
        },

        // Update user data
        updateUserData: function(username, updates) {
          const users = JSON.parse(localStorage.getItem('users') || '{}');
          if (!users[username]) {
            users[username] = {};
          }
          Object.assign(users[username], updates);
          localStorage.setItem('users', JSON.stringify(users));
        },

        // Initialize subscription modal
        initSubscriptionModal: function() {
          const subscribeNowBtn = document.getElementById('subscribeNowBtn');
          if (subscribeNowBtn) {
            subscribeNowBtn.innerHTML = `
              <i class="fas fa-crown"></i>
              Subscribe for ₦8,500/month
            `;
          }
        },

        // Subscribe user with verified payment
        subscribeUser: function(verificationData) {
          const username = this.getCurrentUsername();
          const userData = this.getUserData(username);
          const expiryDate = new Date();
          expiryDate.setMonth(expiryDate.getMonth() + 1);
          
          // Mark any pending payments as completed
          if (userData.pendingPayments) {
            userData.pendingPayments = userData.pendingPayments.map(payment => {
              if (payment.transactionRef === verificationData.data.reference) {
                return {
                  ...payment,
                  status: 'completed',
                  verifiedAt: new Date().toISOString()
                };
              }
              return payment;
            });
          }
          
          // Store subscription details
          this.updateUserData(username, {
            subscription: {
              active: true,
              expiryDate: expiryDate.toISOString(),
              transactionRef: verificationData.data.reference,
              paymentMethod: 'card',
              planType: 'monthly',
              currency: 'NGN',
              cardDetails: {
                last4: verificationData.data.authorization?.last4 || '****',
                cardType: verificationData.data.authorization?.card_type || 'card',
                bank: 'Verified Payment'
              },
              nextBillingDate: expiryDate.toISOString(),
              autoRenew: false,
              lastVerificationAttempt: new Date().toISOString(),
              transactionHistory: [
                ...(this.getUserData(username).subscription?.transactionHistory || []),
                {
                  date: new Date().toISOString(),
                  amount: 8500,
                  currency: 'NGN',
                  transactionRef: verificationData.data.reference,
                  status: 'success',
                  paymentMethod: 'card',
                  verified: true,
                  verificationData: verificationData.data
                }
              ]
            }
          });

          this.updateUI();
          return expiryDate;
        },

        // Process subscription payment via Paystack payment page
        processSubscriptionPayment: function() {
          console.log('Processing subscription payment...');
          
          const username = this.getCurrentUsername();
          const userData = this.getUserData(username);
          
          // Get user email from profile or prompt
          let userEmail = '';
          if (userData.profile && userData.profile.email) {
            userEmail = userData.profile.email;
          } else {
            // Prompt for email if not in profile
            const email = prompt('Please enter your email address for payment receipt:');
            if (email && this.validateEmail(email)) {
              userEmail = email;
              if (!userData.profile) userData.profile = {};
              userData.profile.email = email;
              this.updateUserData(username, userData);
            } else {
              alert('Please enter a valid email address');
              return;
            }
          }

          // Generate a unique transaction reference
          const transactionRef = PaymentVerifier.generateTransactionReference(username);
          
          // Store pending payment
          if (!userData.pendingPayments) userData.pendingPayments = [];
          userData.pendingPayments.push({
            transactionRef: transactionRef,
            date: new Date().toISOString(),
            amount: 8500,
            currency: 'NGN',
            status: 'pending',
            email: userEmail
          });
          this.updateUserData(username, userData);
          
          // Show payment instructions
          this.showPaymentInstructions(transactionRef, userEmail);
        },

        // Show payment instructions with Paystack link
        showPaymentInstructions: function(transactionRef, userEmail) {
          // Create payment instructions modal
          const existingModal = document.querySelector('.payment-instructions-modal');
          if (existingModal) existingModal.remove();
          
          const paymentModal = document.createElement('div');
          paymentModal.className = 'payment-instructions-modal';
          paymentModal.innerHTML = `
            <div class="payment-modal-content">
              <div class="payment-modal-header">
                <h2><i class="fas fa-credit-card"></i> Complete Payment</h2>
                <button class="close-payment-modal" onclick="this.closest('.payment-instructions-modal').remove()">
                  <i class="fas fa-times"></i>
                </button>
              </div>
              <div class="payment-modal-body">
                <div class="payment-info">
                  <div class="payment-amount">
                    <i class="fas fa-money-bill-wave"></i>
                    <div>
                      <span class="amount-label">Amount to Pay</span>
                      <span class="amount-value">₦8,500</span>
                    </div>
                  </div>
                  
                  <div class="payment-steps">
                    <h3><i class="fas fa-list-ol"></i> Important Steps</h3>
                    <ol>
                      <li><strong>Copy your Transaction ID</strong> below</li>
                      <li>Click the <strong>"Proceed to Paystack"</strong> button</li>
                      <li>Complete payment on Paystack (₦8,500)</li>
                      <li><strong>IMPORTANT:</strong> Use the same email: <code>${userEmail}</code></li>
                      <li>After payment, return here and <strong>paste your Transaction ID</strong></li>
                      <li>Click <strong>"Verify Payment"</strong> to activate subscription</li>
                    </ol>
                  </div>
                  
                  <div class="transaction-section">
                    <h3><i class="fas fa-receipt"></i> Your Transaction ID</h3>
                    <div class="transaction-id-display">
                      <input type="text" 
                             id="transactionIdInput" 
                             value="${transactionRef}" 
                             readonly 
                             class="transaction-id-input">
                      <button onclick="SubscriptionManager.copyTransactionId()" class="btn-copy">
                        <i class="fas fa-copy"></i> Copy
                      </button>
                    </div>
                    <p class="transaction-note">Copy this ID and keep it safe. You'll need it to verify payment.</p>
                    
                    <div class="verification-section">
                      <h3><i class="fas fa-check-circle"></i> Verify Payment</h3>
                      <div class="verification-input">
                        <input type="text" 
                               id="verificationInput" 
                               placeholder="Paste Transaction ID after payment"
                               class="verification-id-input">
                        <button onclick="SubscriptionManager.verifyPaymentWithId()" class="btn-verify">
                          <i class="fas fa-check"></i> Verify Payment
                        </button>
                      </div>
                      <p class="verification-note">Paste the Transaction ID from your payment receipt here</p>
                    </div>
                  </div>
                  
                  <div class="payment-actions">
                    <a href="${PAYSTACK_CONFIG.paymentLink}" 
                       target="_blank" 
                       onclick="SubscriptionManager.trackPaymentLinkClick('${transactionRef}')"
                       class="btn btn-primary btn-payment">
                      <i class="fas fa-external-link-alt"></i> Proceed to Paystack
                    </a>
                    <button onclick="SubscriptionManager.checkForPayment()" class="btn btn-secondary">
                      <i class="fas fa-sync-alt"></i> Check Payment Status
                    </button>
                    <button onclick="this.closest('.payment-instructions-modal').remove()" class="btn btn-outline">
                      Cancel
                    </button>
                  </div>
                  
                  <div class="payment-note important">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span><strong>Important:</strong> Subscription will only be activated after successful payment verification. Keep your Transaction ID for support.</span>
                  </div>
                </div>
              </div>
            </div>
          `;
          
          document.body.appendChild(paymentModal);
          
          // Focus on verification input
          setTimeout(() => {
            const verificationInput = document.getElementById('verificationInput');
            if (verificationInput) verificationInput.focus();
          }, 500);
          
          // Add styles if not already added
          if (!document.querySelector('#payment-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'payment-modal-styles';
            style.textContent = `
              .payment-instructions-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.95);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10007;
                animation: fadeIn 0.3s ease;
              }
              .payment-modal-content {
                background: white;
                border-radius: 20px;
                padding: 30px;
                max-width: 600px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                animation: slideUp 0.4s ease;
              }
              .payment-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 25px;
                padding-bottom: 15px;
                border-bottom: 2px solid #f1f1f1;
              }
              .payment-modal-header h2 {
                margin: 0;
                color: #2d3748;
                font-size: 1.8rem;
                display: flex;
                align-items: center;
                gap: 12px;
              }
              .close-payment-modal {
                background: none;
                border: none;
                font-size: 1.5rem;
                color: #718096;
                cursor: pointer;
                padding: 5px;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.3s;
              }
              .close-payment-modal:hover {
                background: #f7fafc;
              }
              .payment-amount {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 16px;
                padding: 25px;
                display: flex;
                align-items: center;
                gap: 20px;
                margin-bottom: 25px;
              }
              .payment-amount i {
                font-size: 3rem;
                opacity: 0.9;
              }
              .amount-label {
                display: block;
                font-size: 0.95rem;
                opacity: 0.9;
                margin-bottom: 5px;
              }
              .amount-value {
                display: block;
                font-size: 2.5rem;
                font-weight: 700;
              }
              .payment-steps {
                background: #f8f9fa;
                border-radius: 16px;
                padding: 20px;
                margin-bottom: 20px;
                border-left: 4px solid #667eea;
              }
              .payment-steps h3 {
                margin: 0 0 15px 0;
                color: #2d3748;
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 1.2rem;
              }
              .payment-steps ol {
                margin: 0;
                padding-left: 20px;
              }
              .payment-steps li {
                margin-bottom: 10px;
                color: #4a5568;
                line-height: 1.5;
              }
              .payment-steps li:last-child {
                margin-bottom: 0;
              }
              .transaction-section {
                background: #f8f9fa;
                border-radius: 16px;
                padding: 20px;
                margin: 20px 0;
              }
              .transaction-section h3 {
                margin: 0 0 15px 0;
                color: #2d3748;
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 1.2rem;
              }
              .transaction-id-display {
                display: flex;
                gap: 10px;
                margin-bottom: 10px;
              }
              .transaction-id-input {
                flex: 1;
                padding: 12px;
                border: 2px solid #e2e8f0;
                border-radius: 10px;
                font-family: monospace;
                font-size: 0.9rem;
                background: white;
                color: #2d3748;
              }
              .btn-copy {
                background: #e2e8f0;
                border: none;
                padding: 0 20px;
                border-radius: 10px;
                cursor: pointer;
                color: #4a5568;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: background 0.3s;
              }
              .btn-copy:hover {
                background: #cbd5e0;
              }
              .transaction-note {
                color: #718096;
                font-size: 0.85rem;
                margin: 10px 0 20px 0;
              }
              .verification-section {
                margin-top: 25px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
              }
              .verification-input {
                display: flex;
                gap: 10px;
                margin-bottom: 10px;
              }
              .verification-id-input {
                flex: 1;
                padding: 12px;
                border: 2px solid #4CAF50;
                border-radius: 10px;
                font-family: monospace;
                font-size: 0.95rem;
                background: white;
                color: #2d3748;
              }
              .verification-id-input:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
              }
              .btn-verify {
                background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
                color: white;
                border: none;
                padding: 0 25px;
                border-radius: 10px;
                cursor: pointer;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: transform 0.3s, box-shadow 0.3s;
              }
              .btn-verify:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(76, 175, 80, 0.3);
              }
              .verification-note {
                color: #4CAF50;
                font-size: 0.85rem;
                margin: 10px 0 0 0;
              }
              .payment-actions {
                display: flex;
                flex-direction: column;
                gap: 12px;
                margin: 25px 0;
              }
              .payment-actions .btn {
                padding: 16px;
                border-radius: 12px;
                font-weight: 600;
                cursor: pointer;
                border: none;
                transition: all 0.3s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                font-size: 1rem;
                text-decoration: none;
              }
              .btn-payment {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              .btn-secondary {
                background: #e2e8f0;
                color: #4a5568;
              }
              .btn-outline {
                background: transparent;
                color: #667eea;
                border: 2px solid #667eea;
              }
              .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
              }
              .payment-note {
                border-radius: 12px;
                padding: 15px;
                display: flex;
                align-items: flex-start;
                gap: 10px;
                font-size: 0.9rem;
                line-height: 1.5;
              }
              .payment-note.important {
                background: #fff8e1;
                border-left: 4px solid #ffc107;
              }
              .payment-note i {
                font-size: 1.2rem;
                margin-top: 2px;
              }
              .payment-note.important i {
                color: #ff9800;
              }
              .payment-note.important span {
                color: #ff9800;
              }
              @keyframes slideUp {
                from {
                  transform: translateY(30px);
                  opacity: 0;
                }
                to {
                  transform: translateY(0);
                  opacity: 1;
                }
              }
            `;
            document.head.appendChild(style);
          }
        },

        // Copy transaction ID to clipboard
        copyTransactionId: function() {
          const transactionIdInput = document.getElementById('transactionIdInput');
          if (transactionIdInput) {
            transactionIdInput.select();
            transactionIdInput.setSelectionRange(0, 99999); // For mobile devices
            
            try {
              navigator.clipboard.writeText(transactionIdInput.value).then(() => {
                this.showNotification('Transaction ID copied to clipboard!', 'success');
              });
            } catch (err) {
              // Fallback for older browsers
              document.execCommand('copy');
              this.showNotification('Transaction ID copied to clipboard!', 'success');
            }
          }
        },

        // Verify payment with transaction ID
        verifyPaymentWithId: function() {
          const verificationInput = document.getElementById('verificationInput');
          if (!verificationInput || !verificationInput.value.trim()) {
            this.showNotification('Please paste your Transaction ID', 'error');
            verificationInput?.focus();
            return;
          }
          
          const transactionRef = verificationInput.value.trim();
          
          // Validate transaction reference format
          if (!PaymentVerifier.isValidTransactionRef(transactionRef)) {
            this.showNotification('Invalid Transaction ID format', 'error');
            return;
          }
          
          this.verifyPayment(transactionRef);
        },

        // Track payment link click
        trackPaymentLinkClick: function(transactionRef) {
              const username = this.getCurrentUsername();
          const userData = this.getUserData(username);
          
          // Update payment tracking
          if (userData.pendingPayments) {
            userData.pendingPayments = userData.pendingPayments.map(payment => {
              if (payment.transactionRef === transactionRef) {
                return {
                  ...payment,
                  linkClickedAt: new Date().toISOString(),
                  status: 'payment_started'
                };
              }
              return payment;
            });
            this.updateUserData(username, userData);
          }
          
          this.showNotification('Payment page opened. Complete payment and return to verify.', 'info');
        },

        // Check for payment
        checkForPayment: function() {
          const verificationInput = document.getElementById('verificationInput');
          if (verificationInput && verificationInput.value.trim()) {
            this.verifyPaymentWithId();
          } else {
            this.showNotification('Please paste your Transaction ID first', 'error');
            verificationInput?.focus();
          }
        },

        // Verify payment with transaction reference
        verifyPayment: async function(transactionRef) {
          console.log('Verifying payment with reference:', transactionRef);
          
          // Show loading
          this.showLoading('Verifying your payment with Paystack...');
          
          try {
            // Verify payment with Paystack
            const verificationResult = await PaymentVerifier.verifyPayment(transactionRef);
            
            if (verificationResult.success) {
              const expiryDate = this.subscribeUser(verificationResult);
              
              // Remove payment instructions modal
              const paymentModal = document.querySelector('.payment-instructions-modal');
              if (paymentModal) paymentModal.remove();
              
              // Close subscription modal if open
              this.closeSubscriptionModal();
              
              // Show success message
              this.showSuccessMessage(expiryDate, verificationResult.data.authorization);
              
              // Update UI
              this.updateUI();
              
              this.showNotification('Payment verified and subscription activated!', 'success');
            } else {
              this.showNotification(verificationResult.message, 'error');
              
              // Show retry button
              const paymentModal = document.querySelector('.payment-instructions-modal');
              if (paymentModal) {
                const retryButton = document.createElement('button');
                retryButton.className = 'btn btn-primary';
                retryButton.innerHTML = '<i class="fas fa-redo"></i> Try Again';
                retryButton.onclick = () => this.verifyPayment(transactionRef);
                
                const actionsDiv = paymentModal.querySelector('.payment-actions');
                if (actionsDiv) {
                  actionsDiv.appendChild(retryButton);
                }
              }
            }
          } catch (error) {
            console.error('Verification error:', error);
            this.showNotification('Verification failed. Please try again.', 'error');
          } finally {
            this.hideLoading();
          }
        },

        // Show loading indicator
        showLoading: function(message) {
          // Remove existing loading if any
          const existing = document.querySelector('.subscription-loading');
          if (existing) existing.remove();
          
          const loading = document.createElement('div');
          loading.className = 'subscription-loading';
          loading.innerHTML = `
            <div class="loading-content">
              <div class="loading-spinner"></div>
              <p>${message}</p>
            </div>
          `;
          
          loading.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10008;
          `;
          
          const style = document.createElement('style');
          style.textContent = `
            .loading-content {
              background: white;
              padding: 30px;
              border-radius: 16px;
              text-align: center;
              animation: fadeIn 0.3s ease;
            }
            .loading-spinner {
              width: 50px;
              height: 50px;
              border: 4px solid #f3f3f3;
              border-top: 4px solid #667eea;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 0 auto 20px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `;
          
          document.head.appendChild(style);
          document.body.appendChild(loading);
        },

        // Hide loading indicator
        hideLoading: function() {
          const loading = document.querySelector('.subscription-loading');
          if (loading) loading.remove();
        },

        // Show success message
        showSuccessMessage: function(expiryDate, cardDetails) {
          // Remove existing success modal if any
          const existing = document.querySelector('.subscription-success-modal');
          if (existing) existing.remove();
          
          const successModal = document.createElement('div');
          successModal.className = 'subscription-success-modal';
          successModal.innerHTML = `
            <div class="success-modal-content">
              <div class="success-icon">
                <i class="fas fa-check-circle"></i>
              </div>
              <h2>🎉 Payment Verified!</h2>
              <p class="success-message">Your payment has been verified and subscription is now active!</p>
              
              <div class="success-details">
                <div class="detail-item">
                  <i class="fas fa-crown"></i>
                  <div>
                    <div class="detail-label">Plan</div>
                    <div class="detail-value">Premium Monthly</div>
                  </div>
                </div>
                <div class="detail-item">
                  <i class="fas fa-calendar"></i>
                  <div>
                    <div class="detail-label">Expires</div>
                    <div class="detail-value">${expiryDate.toLocaleDateString()}</div>
                  </div>
                </div>
                <div class="detail-item">
                  <i class="fas fa-shield-alt"></i>
                  <div>
                    <div class="detail-label">Status</div>
                    <div class="detail-value">Payment Verified ✓</div>
                  </div>
                </div>
              </div>
              
              <div class="features-unlocked">
                <h3><i class="fas fa-unlock"></i> Premium Features Unlocked</h3>
                <div class="features-grid">
                  <div class="feature">
                    <i class="fas fa-brain"></i>
                    <span>Brain Teasers</span>
                  </div>
                  <div class="feature">
                    <i class="fas fa-microphone-alt"></i>
                    <span>Audio to Text</span>
                  </div>
                  <div class="feature">
                    <i class="fas fa-rocket"></i>
                    <span>Priority Support</span>
                  </div>
                  <div class="feature">
                    <i class="fas fa-ad"></i>
                    <span>Ad-Free Experience</span>
                  </div>
                </div>
              </div>
              
              <div class="success-actions">
                <button onclick="this.closest('.subscription-success-modal').remove(); window.location.href='brainteaser.html';" class="btn btn-primary">
                  <i class="fas fa-brain"></i> Start Using Premium Features
                </button>
                <button onclick="this.closest('.subscription-success-modal').remove();" class="btn btn-secondary">
                  Continue to Dashboard
                </button>
              </div>
              
              <p class="success-note">
                <i class="fas fa-info-circle"></i>
                Your subscription is active until ${expiryDate.toLocaleDateString()}. You will need to renew manually before expiry.
              </p>
            </div>
          `;
          
          document.body.appendChild(successModal);
          
          // Add styles if not already added
          if (!document.querySelector('#success-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'success-modal-styles';
            style.textContent = `
              .subscription-success-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.95);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10009;
                animation: fadeIn 0.3s ease;
              }
              .success-modal-content {
                background: white;
                border-radius: 20px;
                padding: 40px;
                max-width: 500px;
                width: 90%;
                animation: slideUp 0.4s ease;
              }
              .success-icon {
                font-size: 4rem;
                color: #4CAF50;
                text-align: center;
                margin-bottom: 20px;
              }
              .success-modal-content h2 {
                color: #2d3748;
                margin: 0 0 10px 0;
                text-align: center;
                font-size: 1.8rem;
              }
              .success-message {
                color: #718096;
                text-align: center;
                margin-bottom: 30px;
                font-size: 1.1rem;
              }
              .success-details {
                background: #f7fafc;
                border-radius: 16px;
                padding: 20px;
                margin: 25px 0;
              }
              .detail-item {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 10px 0;
                border-bottom: 1px solid #e2e8f0;
              }
              .detail-item:last-child {
                border-bottom: none;
              }
              .detail-item i {
                font-size: 1.5rem;
                color: #667eea;
                width: 30px;
              }
              .detail-label {
                color: #718096;
                font-size: 0.9rem;
                margin-bottom: 3px;
              }
              .detail-value {
                color: #2d3748;
                font-weight: 600;
                font-size: 1rem;
              }
              .features-unlocked {
                margin-bottom: 30px;
              }
              .features-unlocked h3 {
                margin: 0 0 15px 0;
                color: #2d3748;
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 1.2rem;
              }
              .features-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
              }
              .feature {
                background: white;
                border: 2px solid #e2e8f0;
                border-radius: 12px;
                padding: 15px;
                display: flex;
                align-items: center;
                gap: 10px;
                transition: transform 0.3s;
              }
              .feature:hover {
                transform: translateY(-3px);
                border-color: #667eea;
              }
              .feature i {
                color: #667eea;
                font-size: 1.2rem;
              }
              .feature span {
                color: #2d3748;
                font-weight: 500;
              }
              .success-actions {
                display: flex;
                gap: 15px;
                margin: 30px 0 20px;
              }
              .success-actions .btn {
                flex: 1;
                padding: 15px;
                border-radius: 12px;
                font-weight: 600;
                cursor: pointer;
                border: none;
                transition: transform 0.3s, box-shadow 0.3s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
              }
              .btn-primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              .btn-secondary {
                background: #e2e8f0;
                color: #4a5568;
              }
              .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
              }
              .success-note {
                color: #718096;
                font-size: 0.9rem;
                text-align: center;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                margin-top: 20px;
              }
              @keyframes slideUp {
                from {
                  transform: translateY(30px);
                  opacity: 0;
                }
                to {
                  transform: translateY(0);
                  opacity: 1;
                }
              }
            `;
            document.head.appendChild(style);
          }
        },

        // Update UI based on subscription status
        updateUI: function() {
          const isSubscribed = this.isSubscribed();
          console.log('Updating UI, subscribed:', isSubscribed);
          
          // Update subscription status badge
          const subscriptionStatus = document.getElementById('subscriptionStatus');
          const subscriptionText = document.getElementById('subscriptionText');
          
          if (subscriptionStatus && subscriptionText) {
            if (isSubscribed) {
              const subscriptionDetails = this.getSubscriptionDetails();
              const expiryDate = new Date(subscriptionDetails.expiryDate);
              const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
              
              subscriptionStatus.style.display = 'flex';
              subscriptionText.innerHTML = `
                <i class="fas fa-crown"></i>
                <span>Premium (${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left)</span>
              `;
            } else {
              subscriptionStatus.style.display = 'none';
            }
          }

          // Update premium notice
          const premiumNotice = document.getElementById('premiumNotice');
          if (premiumNotice) {
            premiumNotice.style.display = isSubscribed ? 'none' : 'flex';
          }

          // Update premium tools
          this.updatePremiumTools(isSubscribed);

          // Update settings subscription status
          this.updateSettingsSubscriptionStatus(isSubscribed);
        },

        // Update premium tools
        updatePremiumTools: function(isSubscribed) {
          const brainTool = document.getElementById('brainTool');
          const audioTool = document.getElementById('audioTool');

          if (isSubscribed) {
            // Unlock tools
            if (brainTool) {
              brainTool.classList.remove('locked');
              brainTool.onclick = () => window.location.href = 'brainteaser.html';
              const lockOverlay = brainTool.querySelector('.lock-overlay');
              const premiumBadge = brainTool.querySelector('.premium-badge');
              if (lockOverlay) lockOverlay.style.display = 'none';
              if (premiumBadge) premiumBadge.innerHTML = '<i class="fas fa-crown"></i> PREMIUM';
            }
            if (audioTool) {
              audioTool.classList.remove('locked');
              audioTool.onclick = () => window.location.href = 'audio-text.html';
              const lockOverlay = audioTool.querySelector('.lock-overlay');
              const premiumBadge = audioTool.querySelector('.premium-badge');
              if (lockOverlay) lockOverlay.style.display = 'none';
              if (premiumBadge) premiumBadge.innerHTML = '<i class="fas fa-crown"></i> PREMIUM';
            }
          } else {
            // Lock tools
            if (brainTool) {
              brainTool.classList.add('locked');
              brainTool.onclick = () => this.openSubscriptionModal();
              const lockOverlay = brainTool.querySelector('.lock-overlay');
              const premiumBadge = brainTool.querySelector('.premium-badge');
              if (lockOverlay) lockOverlay.style.display = 'flex';
              if (premiumBadge) premiumBadge.innerHTML = '<i class="fas fa-lock"></i> PREMIUM';
            }
            if (audioTool) {
              audioTool.classList.add('locked');
              audioTool.onclick = () => this.openSubscriptionModal();
              const lockOverlay = audioTool.querySelector('.lock-overlay');
              const premiumBadge = audioTool.querySelector('.premium-badge');
              if (lockOverlay) lockOverlay.style.display = 'flex';
              if (premiumBadge) premiumBadge.innerHTML = '<i class="fas fa-lock"></i> PREMIUM';
            }
          }
        },

        // Update settings subscription status
        updateSettingsSubscriptionStatus: function(isSubscribed) {
          const settingsSubscriptionStatus = document.getElementById('settingsSubscriptionStatus');
          if (!settingsSubscriptionStatus) return;

          if (isSubscribed) {
            const subscriptionDetails = this.getSubscriptionDetails();
            const expiryDate = new Date(subscriptionDetails.expiryDate);
            
            settingsSubscriptionStatus.innerHTML = `
              <div class="subscription-status-card">
                <div class="subscription-status-header">
                  <i class="fas fa-crown"></i>
                  <div class="subscription-info">
                    <h4>Premium Subscription</h4>
                    <p>Active • Payment Verified ✓</p>
                  </div>
                </div>
                <div class="subscription-details">
                  <div class="detail-item">
                    <span class="detail-label">Expires:</span>
                    <span class="detail-value">${expiryDate.toLocaleDateString()}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value verified">Payment Verified</span>
                  </div>
                </div>
                <div class="subscription-actions">
                  <button class="btn btn-primary" onclick="SubscriptionManager.processRenewalPayment()">
                    <i class="fas fa-sync-alt"></i> Renew Subscription
                  </button>
                </div>
              </div>
            `;
          } else {
            settingsSubscriptionStatus.innerHTML = `
              <button class="subscribe-btn-large" id="manageSubscriptionBtnLarge">
                <i class="fas fa-crown"></i> 
                <div>
                  <span class="btn-title">Upgrade to Premium</span>
                  <span class="btn-subtitle">₦8,500/month • Payment Required</span>
                </div>
              </button>
            `;
          }
        },

        // Process renewal payment
        processRenewalPayment: function() {
          if (confirm('You will be redirected to Paystack to renew your subscription for ₦8,500. Continue?')) {
            this.processSubscriptionPayment();
          }
        },

        // Open subscription modal
        openSubscriptionModal: function() {
          console.log('Opening subscription modal...');
          const modal = document.getElementById('subscriptionModal');
          if (!modal) {
            console.error('Subscription modal not found!');
            return;
          }

          const alreadySubscribed = document.getElementById('alreadySubscribed');
          const subscriptionContent = document.getElementById('subscriptionContent');

          if (this.isSubscribed()) {
            if (alreadySubscribed) alreadySubscribed.style.display = 'flex';
            if (subscriptionContent) subscriptionContent.style.display = 'none';
          } else {
            if (alreadySubscribed) alreadySubscribed.style.display = 'none';
            if (subscriptionContent) subscriptionContent.style.display = 'block';
            this.initSubscriptionModal();
          }

          modal.classList.add('active');
          document.body.style.overflow = 'hidden';
        },

        // Close subscription modal
        closeSubscriptionModal: function() {
          const modal = document.getElementById('subscriptionModal');
          if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
          }
          
          // Close other modals
          const modals = [
            document.querySelector('.payment-instructions-modal'),
            document.querySelector('.subscription-success-modal'),
            document.getElementById('subscriptionDetailsModal')
          ];
          
          modals.forEach(modal => {
            if (modal) modal.remove();
          });
        },

        // Validate email
        validateEmail: function(email) {
          const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return re.test(email);
        },

        // Get user email
        getUserEmail: function() {
          const username = this.getCurrentUsername();
          const userData = this.getUserData(username);
          return userData.profile?.email || '';
        },

        // Show notification
        showNotification: function(message, type = 'success') {
          if (window.SettingsManager && SettingsManager.showNotification) {
            SettingsManager.showNotification(message, type);
          } else {
            // Create simple notification
            const notification = document.createElement('div');
            notification.className = `simple-notification ${type}`;
            notification.innerHTML = `
              <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
              <span>${message}</span>
            `;
            notification.style.cssText = `
              position: fixed;
              top: 20px;
              right: 20px;
              background: ${type === 'success' ? '#4CAF50' : '#f44336'};
              color: white;
              padding: 12px 20px;
              border-radius: 8px;
              display: flex;
              align-items: center;
              gap: 10px;
              z-index: 10000;
              animation: slideIn 0.3s ease;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
              notification.style.animation = 'slideOut 0.3s ease';
              setTimeout(() => {
                if (notification.parentNode) {
                  document.body.removeChild(notification);
                }
              }, 300);
            }, 3000);
          }
        },

        // Initialize subscription management
        init: function() {
          console.log('Initializing SubscriptionManager...');
          
          // Add event listeners after DOM is loaded
          setTimeout(() => {
            this.setupEventListeners();
            this.updateUI();
          }, 100);
        },

        // Setup event listeners
        setupEventListeners: function() {
          console.log('Setting up event listeners...');
          
          // Subscription link in premium notice
          const subscribeLink = document.getElementById('subscribeLink');
          if (subscribeLink) {
            console.log('Found subscribe link');
            subscribeLink.addEventListener('click', (e) => {
              e.preventDefault();
              this.openSubscriptionModal();
            });
          }

          // Subscription buttons in tools modal
          const subscribeButtons = document.querySelectorAll('.subscribe-btn');
          subscribeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              this.openSubscriptionModal();
            });
          });

          // Manage subscription button in settings
          document.addEventListener('click', (e) => {
            if (e.target.id === 'manageSubscriptionBtn' || e.target.id === 'manageSubscriptionBtnLarge' || e.target.closest('#manageSubscriptionBtn') || e.target.closest('#manageSubscriptionBtnLarge')) {
              e.preventDefault();
              this.openSubscriptionModal();
            }
          });

          // Subscription modal buttons
          const subscribeNowBtn = document.getElementById('subscribeNowBtn');
          if (subscribeNowBtn) {
            console.log('Found subscribe button, adding click listener');
            subscribeNowBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Subscribe button clicked!');
              this.processSubscriptionPayment();
            });
          } else {
            console.error('Subscribe button not found!');
          }

          const cancelSubscription = document.getElementById('cancelSubscription');
          if (cancelSubscription) {
            cancelSubscription.addEventListener('click', (e) => {
              e.preventDefault();
              this.closeSubscriptionModal();
            });
          }

          const closeSubscription = document.getElementById('closeSubscription');
          if (closeSubscription) {
            closeSubscription.addEventListener('click', (e) => {
              e.preventDefault();
              this.closeSubscriptionModal();
            });
          }

          // Close subscription modal when clicking outside
          const subscriptionModal = document.getElementById('subscriptionModal');
          if (subscriptionModal) {
            subscriptionModal.addEventListener('click', (e) => {
              if (e.target === subscriptionModal) {
                this.closeSubscriptionModal();
              }
            });
          }
        }
      };

      // Add CSS for improved subscription UI
      const subscriptionStyles = `
        <style>
          /* Subscription Modal Styles */
          .subscription-modal .modal-content {
            max-width: 500px;
            border-radius: 20px;
            overflow: hidden;
            animation: modalSlideIn 0.3s ease;
          }
          
          .subscription-modal .modal-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px 30px;
            text-align: center;
          }
          
          .subscription-modal .modal-header h2 {
            margin: 0;
            font-size: 1.8rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
          }
          
          .subscription-modal .modal-header h2 i {
            font-size: 1.5rem;
          }
          
          #closeSubscription {
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            font-size: 1.3rem;
            cursor: pointer;
            transition: background 0.3s;
          }
          
          #closeSubscription:hover {
            background: rgba(255,255,255,0.3);
          }
          
          .subscription-modal .modal-body {
            padding: 30px;
          }
          
          .plan-card {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 25px;
            text-align: center;
            border: 2px solid var(--mature-accent);
          }
          
          .plan-card h3 {
            margin: 0 0 15px 0;
            color: #2d3748;
            font-size: 1.5rem;
            font-weight: 600;
          }
          
          .price-display {
            margin: 20px 0;
          }
          
          .price-amount {
            font-size: 3rem;
            font-weight: 700;
            color: var(--mature-accent);
            line-height: 1;
          }
          
          .price-period {
            font-size: 1.2rem;
            color: #718096;
            margin-top: 5px;
          }
          
          .feature-list {
            list-style: none;
            padding: 0;
            margin: 25px 0;
            text-align: left;
          }
          
          .feature-list li {
            padding: 10px 0;
            display: flex;
            align-items: center;
            gap: 12px;
            color: #4a5568;
          }
          
          .feature-list li i {
            color: #48bb78;
            font-size: 1.1rem;
          }
          
          .plan-footer {
            margin-top: 25px;
          }
          
          #subscribeNowBtn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 18px 30px;
            border-radius: 12px;
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            transition: transform 0.3s, box-shadow 0.3s;
          }
          
          #subscribeNowBtn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
          }
          
          #subscribeNowBtn:active {
            transform: translateY(0);
          }
          
          #subscribeNowBtn i {
            font-size: 1.2rem;
          }
          
          #cancelSubscription {
            background: transparent;
            color: #718096;
            border: none;
            padding: 15px;
            width: 100%;
            cursor: pointer;
            font-size: 1rem;
            margin-top: 15px;
            transition: color 0.3s;
          }
          
          #cancelSubscription:hover {
            color: #4a5568;
          }
          
          .benefits-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin: 25px 0;
          }
          
          .benefit-item {
            background: white;
            padding: 15px;
            border-radius: 12px;
            text-align: center;
            border: 1px solid #e2e8f0;
            transition: transform 0.3s;
          }
          
          .benefit-item:hover {
            transform: translateY(-3px);
          }
          
          .benefit-item i {
            font-size: 1.8rem;
            color: var(--mature-accent);
            margin-bottom: 10px;
          }
          
          .benefit-item h4 {
            margin: 0 0 5px 0;
            font-size: 0.95rem;
            color: #2d3748;
          }
          
          .benefit-item p {
            margin: 0;
            font-size: 0.85rem;
            color: #718096;
          }
          
          /* Subscription Status Card */
          .subscription-status-card {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 16px;
            padding: 20px;
            border: 2px solid #dee2e6;
            margin: 15px 0;
          }
          
          .subscription-status-header {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 20px;
          }
          
          .subscription-status-header i {
            font-size: 2rem;
            color: #ffd700;
            background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          
          .subscription-info h4 {
            margin: 0;
            color: #2d3748;
            font-size: 1.2rem;
          }
          
          .subscription-info p {
            margin: 5px 0 0 0;
            color: #718096;
            font-size: 0.9rem;
          }
          
          .subscription-details {
            background: white;
            border-radius: 12px;
            padding: 15px;
            margin: 15px 0;
            border: 1px solid #e2e8f0;
          }
          
          .detail-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #f1f1f1;
          }
          
          .detail-item:last-child {
            border-bottom: none;
          }
          
          .detail-label {
            color: #718096;
            font-size: 0.95rem;
          }
          
          .detail-value {
            color: #2d3748;
            font-weight: 500;
            font-size: 0.95rem;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .verified {
            color: #4CAF50;
            font-weight: 600;
          }
          
          .subscription-actions {
            display: flex;
            gap: 10px;
            margin-top: 20px;
          }
          
          .subscription-actions .btn {
            flex: 1;
            padding: 12px;
            border-radius: 10px;
            font-weight: 500;
            font-size: 0.95rem;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
          
          .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
          }
          
          .btn-secondary {
            background: white;
            color: #4a5568;
            border: 1px solid #e2e8f0;
          }
          
          .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.2);
          }
          
          .btn-secondary:hover {
            background: #f7fafc;
            border-color: #cbd5e0;
          }
          
          /* Already Subscribed Message */
          .subscribed-message {
            text-align: center;
            padding: 40px 20px;
          }
          
          .subscribed-message i {
            font-size: 4rem;
            color: #48bb78;
            margin-bottom: 20px;
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          
          .subscribed-message h3 {
            margin: 0 0 10px 0;
            color: #2d3748;
            font-size: 1.8rem;
          }
          
          .subscribed-message p {
            color: #718096;
            font-size: 1.1rem;
            margin: 0;
          }
          
          /* Subscribe Button Large */
          .subscribe-btn-large {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 20px;
            border-radius: 16px;
            width: 100%;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 15px;
            transition: transform 0.3s, box-shadow 0.3s;
            text-align: left;
          }
          
          .subscribe-btn-large:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
          }
          
          .subscribe-btn-large i {
            font-size: 2rem;
            background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          
          .subscribe-btn-large .btn-title {
            font-size: 1.2rem;
            font-weight: 600;
            display: block;
          }
          
          .subscribe-btn-large .btn-subtitle {
            font-size: 0.9rem;
            opacity: 0.9;
            display: block;
            margin-top: 4px;
          }
          
          /* Premium Notice */
          .premium-notice {
            background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #ffc107;
            display: flex;
            align-items: center;
            gap: 15px;
          }
          
          .premium-notice i {
            font-size: 1.8rem;
            color: #ffc107;
          }
          
          .premium-notice-content h3 {
            margin: 0 0 5px 0;
            color: #ff9800;
            font-size: 1.2rem;
          }
          
          .premium-notice-content p {
            margin: 0;
            color: #ff9800;
            font-size: 0.95rem;
          }
          
          #subscribeLink {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
            cursor: pointer;
          }
          
          #subscribeLink:hover {
            text-decoration: underline;
          }
          
          /* Subscription Details Modal */
          .subscription-details-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
          }
          
          .subscription-details-modal .modal-content {
            background: white;
            border-radius: 20px;
            width: 90%;
            max-width: 500px;
            max-height: 90vh;
            overflow-y: auto;
            animation: modalSlideIn 0.3s ease;
          }
          
          .status-banner {
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
            font-weight: 500;
          }
          
          .plan-details {
            background: #f8f9fa;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 20px;
          }
          
          .plan-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }
          
          .plan-header h3 {
            margin: 0;
            color: #2d3748;
            font-size: 1.3rem;
          }
          
          .plan-price {
            font-size: 2rem;
            font-weight: 700;
            color: #2d3748;
          }
          
          .plan-price span {
            font-size: 1rem;
            color: #718096;
          }
          
          .detail-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
          }
          
          .card-section, .billing-section {
            background: #f8f9fa;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 20px;
          }
          
          .transaction-display {
            background: white;
            border-radius: 12px;
            padding: 15px;
            border: 1px solid #e2e8f0;
          }
          
          .transaction-ref {
            margin-bottom: 10px;
          }
          
          .ref-label {
            color: #718096;
            font-size: 0.9rem;
            display: block;
            margin-bottom: 5px;
          }
          
          .transaction-ref code {
            background: #f7fafc;
            padding: 8px 12px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 0.9rem;
            color: #2d3748;
            border: 1px solid #e2e8f0;
            display: block;
            word-break: break-all;
          }
          
          .transaction-meta {
            display: flex;
            justify-content: space-between;
            font-size: 0.85rem;
            color: #718096;
          }
          
          .billing-history {
            background: white;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            overflow: hidden;
          }
          
          .billing-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 15px;
            border-bottom: 1px solid #f1f1f1;
          }
          
          .billing-item:last-child {
            border-bottom: none;
          }
          
          .billing-date {
            color: #718096;
            font-size: 0.9rem;
          }
          
          .billing-amount {
            color: #2d3748;
            font-weight: 600;
          }
          
          .billing-status {
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 500;
          }
          
          .billing-status.success {
            background: #c6f6d5;
            color: #22543d;
          }
          
          .btn-full {
            width: 100%;
            padding: 15px;
            margin: 8px 0;
            border-radius: 12px;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            transition: all 0.3s;
            border: none;
            font-size: 1rem;
          }
          
          .btn-full.btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          
          .btn-full.btn-outline {
            background: transparent;
            color: #667eea;
            border: 1px solid #667eea;
          }
          
          .btn-full:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
          }
          
          .modal-footer {
            margin-top: 20px;
            text-align: center;
          }
          
          .footer-note {
            color: #718096;
            font-size: 0.9rem;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
          
          /* Animations */
          @keyframes modalSlideIn {
            from {
              transform: translateY(-30px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
          
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          
          @keyframes slideOut {
            from {
              transform: translateX(0);
              opacity: 1;
            }
            to {
              transform: translateX(100%);
              opacity: 0;
            }
          }
          
          /* Responsive */
          @media (max-width: 480px) {
            .subscription-modal .modal-body {
              padding: 20px;
            }
            
            .plan-card {
              padding: 20px;
            }
            
            .price-amount {
              font-size: 2.5rem;
            }
            
            .benefits-grid {
              grid-template-columns: 1fr;
            }
            
            .detail-grid {
              grid-template-columns: 1fr;
            }
            
            .subscription-status-card {
              padding: 15px;
            }
            
            .subscription-actions {
              flex-direction: column;
            }
          }
          
          /* Premium Tools Styling */
          .tool-card.locked {
            position: relative;
          }
          
          .lock-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255,255,255,0.9);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border-radius: 16px;
            z-index: 2;
          }
          
          .lock-overlay i {
            font-size: 2.5rem;
            color: #ffc107;
            margin-bottom: 10px;
          }
          
          .lock-overlay span {
            color: #ff9800;
            font-weight: 600;
            font-size: 1.1rem;
          }
          
          .premium-badge {
            position: absolute;
            top: 12px;
            right: 12px;
            background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
            color: #8c6d1f;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            z-index: 1;
            display: flex;
            align-items: center;
            gap: 5px;
          }
          
          .expiry-notice {
            background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
            border-radius: 10px;
            padding: 12px 15px;
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 10px 0;
            border-left: 3px solid #ffc107;
          }
          
          .expiry-notice i {
            color: #ff9800;
            font-size: 1.2rem;
          }
          
          .expiry-notice span {
            color: #ff9800;
            font-weight: 500;
            font-size: 0.95rem;
          }
          
          .payment-verified-badge {
            background: #4CAF50;
            color: white;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 500;
            display: inline-flex;
            align-items: center;
            gap: 5px;
          }
          
          .transaction-id-input:read-only {
            cursor: copy;
            user-select: all;
          }
          
          .verification-section {
            animation: fadeIn 0.5s ease;
          }
        </style>
      `;

      // Add styles to document head
      document.head.insertAdjacentHTML('beforeend', subscriptionStyles);

      // Make PaymentVerifier globally accessible
      window.PaymentVerifier = PaymentVerifier;

      // Logout function that works across all pages
      async function logoutUser() {
        if (window.SupabaseAuthManager && typeof window.SupabaseAuthManager.logout === 'function') {
          const loggedOut = await window.SupabaseAuthManager.logout();
          if (loggedOut) return;
        }

        // Save settings before logout
        if (window.saveSettingsToLocalStorage) {
          saveSettingsToLocalStorage();
        }
        
        try {
          // Sign out from Supabase to clear session
          if (supabase) {
            await supabase.auth.signOut();
          }
        } catch (error) {
          console.error('Error signing out from Supabase:', error);
        }
        
        // Clear user session data
        localStorage.removeItem('currentUser');
        localStorage.removeItem('loginUser');
        localStorage.removeItem('user_id');
        sessionStorage.removeItem('currentUser');

        const authKeysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.includes('supabase.auth.token'))) {
            authKeysToRemove.push(key);
          }
        }
        authKeysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Clear any other user-specific data if needed
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('_notes') || key.includes('_timetable') || key.includes('_gpa'))) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Show logout notification
        if (window.SettingsManager && SettingsManager.showNotification) {
          SettingsManager.showNotification('Logged out successfully', 'success');
        }
        
        // Redirect to login page after a short delay
        setTimeout(() => {
          window.location.href = "login.html";
        }, 1500);
      }

      window.logoutUser = logoutUser;

      // Function to update all dashboard counts and stats
      // Global Data Manager for Supabase Sync
      const dataManager = {
        async getStats(userId) {
          try {
            if (!supabase) return { count: 0 };
            const { count: notes } = await supabase.from('notes').select('*', { count: 'exact', head: true }).eq('user_id', userId);
            const { count: classes } = await supabase.from('timetable').select('*', { count: 'exact', head: true }).eq('user_id', userId);
            const { data: gpaData } = await supabase.from('gpa_records').select('grade, units').eq('user_id', userId);
            
            let gpa = 0;
            if (gpaData && gpaData.length > 0) {
              const gradePoints = { 'A+': 5.0, 'A': 5.0, 'B': 4.0, 'C': 3.0, 'D': 2.0, 'E': 1.0, 'F': 0.0 };
              let totalPoints = 0, totalUnits = 0;
              gpaData.forEach(r => {
                const pts = gradePoints[r.grade] || 0;
                totalPoints += pts * r.units;
                totalUnits += r.units;
              });
              gpa = totalUnits > 0 ? (totalPoints / totalUnits) : 0;
            }
            
            return { notes: notes || 0, classes: classes || 0, gpa: gpa.toFixed(2), gpaCount: gpaData?.length || 0 };
          } catch (e) {
            console.error('Stats error:', e);
            return { notes: 0, classes: 0, gpa: '0.00', gpaCount: 0 };
          }
        },
        
        async getRecentActivity(userId) {
          try {
            if (!supabase) return [];
            const { data } = await supabase.from('activity_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5);
            return data || [];
          } catch (e) {
            return [];
          }
        }
      };

      async function updateDashboardCounts() {
        let user = await resolveCurrentUser();
        if (!user) {
          updateWelcomeMessage('Student');
          return;
        }

        updateWelcomeMessage(getUserDisplayName(user));

        if (!user.id) {
          updateStatsDisplay(0, 0, 0);
          renderActivityFeed([], { notes: 0, classes: 0, gpa: '0.00' });
          return;
        }

        const stats = await dataManager.getStats(user.id);
        updateStatsDisplay(stats.notes, stats.classes, parseFloat(stats.gpa));

        // Fetch and display real activity
        const activities = await dataManager.getRecentActivity(user.id);
        renderActivityFeed(activities, stats);
      }

      function renderActivityFeed(dbActivities, stats) {
        const container = document.getElementById('recentActivity');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (dbActivities.length === 0) {
          // Show default based on stats if no logs yet
          const items = [];
          if (stats.notes > 0) items.push({ icon: 'fa-sticky-note', title: 'Notes Collection', text: `You have ${stats.notes} notes saved.`, time: 'Active' });
          if (stats.classes > 0) items.push({ icon: 'fa-calendar-alt', title: 'Timetable', text: `${stats.classes} classes scheduled.`, time: 'Active' });
          
          if (items.length === 0) {
             items.push({ icon: 'fa-rocket', title: 'Get Started', text: 'Create your first note or schedule a class!', time: 'Now' });
          }
          
          items.forEach(item => container.appendChild(createActivityEl(item)));
        } else {
          dbActivities.forEach(log => {
            container.appendChild(createActivityEl({
              icon: log.activity_type === 'note' ? 'fa-sticky-note' : (log.activity_type === 'class' ? 'fa-calendar-alt' : 'fa-chart-line'),
              title: log.action || 'Activity Update',
              text: log.details || 'Your account was updated.',
              time: new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }));
          });
        }
      }

      function createActivityEl(item) {
        const div = document.createElement('div');
        div.className = 'activity-item';
        div.innerHTML = `
          <div class="activity-icon"><i class="fas ${item.icon}"></i></div>
          <div class="activity-content">
            <h4>${item.title}</h4>
            <p>${item.text}</p>
            <div class="activity-time">${item.time}</div>
          </div>
        `;
        return div;
      }

      // Helper function to get time-based greeting
      function getTimeBasedGreeting() {
        const now = new Date();
        const hour = now.getHours();

        if (hour >= 5 && hour < 12) {
          return 'Good morning';
        } else if (hour >= 12 && hour < 17) {
          return 'Good afternoon';
        } else if (hour >= 17 && hour < 22) {
          return 'Good evening';
        } else {
          return 'Good night';
        }
      }

      function getStoredCurrentUserRaw() {
        return localStorage.getItem('currentUser') || localStorage.getItem('loginUser') || '';
      }

      function parseCurrentUser(rawUser = getStoredCurrentUserRaw()) {
        if (!rawUser || rawUser === 'guest') return null;

        if (typeof rawUser === 'object') {
          return rawUser;
        }

        try {
          return JSON.parse(rawUser);
        } catch (e) {
          const trimmed = String(rawUser).trim();
          return {
            username: trimmed.includes('@') ? trimmed.split('@')[0] : trimmed,
            firstName: '',
            email: trimmed.includes('@') ? trimmed : '',
            id: ''
          };
        }
      }

      function getUserDisplayName(user = parseCurrentUser()) {
        if (!user) return 'Student';

        // If the parsed user is just a string
        if (typeof user === 'string' && user.trim()) return user.trim();

        const candidates = [
          user.username,
          user.firstName,
          user.name,
          user.lastName,
          user.email ? user.email.split('@')[0] : ''
        ];

        const match = candidates.find(value => typeof value === 'string' && value.trim());
        return match ? match.trim() : 'Student';
      }

      async function resolveCurrentUser() {
        let user = parseCurrentUser();
        if (user) {
          return enrichCurrentUserProfile(user);
        }

        if (!supabase || !supabase.auth || typeof supabase.auth.getUser !== 'function') {
          return null;
        }

        try {
          const { data } = await supabase.auth.getUser();
          const authUser = data?.user;
          if (!authUser) {
            return null;
          }

          const emailPrefix = authUser.email && authUser.email.includes('@')
            ? authUser.email.split('@')[0]
            : '';

          user = {
            id: authUser.id || '',
            email: authUser.email || '',
            username: authUser.user_metadata?.username || emailPrefix,
            firstName: authUser.user_metadata?.first_name || emailPrefix,
            lastName: authUser.user_metadata?.last_name || ''
          };

          localStorage.setItem('currentUser', JSON.stringify(user));
          return enrichCurrentUserProfile(user);
        } catch (error) {
          console.error('Could not resolve active user session on homepage:', error);
          return null;
        }
      }



      async function enrichCurrentUserProfile(user = parseCurrentUser()) {
        if (!user || !supabase) return user;

        try {
          let profileData = null;

          if (user.id) {
            // First check profiles table which has all columns including bio and avatar_url
            const { data: profilesRow } = await supabase
              .from('profiles')
              .select('username, first_name, last_name, email, avatar_url, bio, created_at')
              .eq('id', user.id)
              .maybeSingle();

            profileData = profilesRow || null;

            if (!profileData) {
              // Fallback to users view
              const { data: usersRow } = await supabase
                .from('users')
                .select('username, first_name, last_name, email, created_at')
                .eq('id', user.id)
                .maybeSingle();

              profileData = usersRow || null;
            }
          }

          if (!profileData && user.email) {
            const { data: profilesByEmail } = await supabase
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
            profilePic: profileData.avatar_url || user.profilePic || null,
            bio: profileData.bio || user.bio || 'No bio added yet.',
            memberSince: profileData.created_at || null
          };

          localStorage.setItem('currentUser', JSON.stringify(mergedUser));
          return mergedUser;
        } catch (error) {
          console.error('Could not enrich current user profile:', error);
          return user;
        }
      }

      // Helper function to update welcome message
      function updateWelcomeMessage(username) {
        const welcomeMsg = document.getElementById('welcomeMsg');
        const userIdentityChip = document.getElementById('userIdentityChip');
        if (welcomeMsg) {
          welcomeMsg.textContent = `Ready to win the week, ${username}?`;
        }
        if (userIdentityChip) {
          userIdentityChip.innerHTML = `<i class="fas fa-user"></i> Signed in as ${username}`;
        }
      }

      // Helper function to update stats display with animations
      function updateStatsDisplay(notesCount, classCount, gpaAverage) {
        // Animate counters
        const animateCounter = (elementId, targetValue, suffix = '', isDecimal = false) => {
          const element = document.getElementById(elementId);
          if (!element) return;

          let current = 0;
          const increment = targetValue / 50;
          const timer = setInterval(() => {
            current += increment;
            if (current >= targetValue) {
              current = targetValue;
              clearInterval(timer);
            }
            element.textContent = isDecimal ? current.toFixed(2) + suffix : Math.floor(current) + suffix;
          }, 20);
        };

        // Animate progress bars
        const animateProgress = (elementId, percentage) => {
          const element = document.getElementById(elementId);
          if (element) {
            setTimeout(() => {
              element.style.width = `${percentage}%`;
            }, 300);
          }
        };

        // Calculate percentages based on realistic targets
        const notesPercent = Math.min((notesCount / Math.max(notesCount, 10)) * 100, 100);
        const classPercent = Math.min((classCount / Math.max(classCount, 5)) * 100, 100);
        const gpaPercent = Math.min((gpaAverage / 4.0) * 100, 100);

        // Start animations
        animateCounter('notesCountDisplay', notesCount);
        animateCounter('classCountDisplay', classCount);
        animateCounter('gpaCountDisplay', gpaAverage, '', true);

        setTimeout(() => {
          animateProgress('notesProgress', notesPercent);
          animateProgress('classProgress', classPercent);
          animateProgress('gpaProgress', gpaPercent);
        }, 500);
      }

      // Helper functions used by settings to refresh UI
      function refreshDashboard() {
        if (typeof updateDashboardCounts === 'function') {
          updateDashboardCounts();
        }
      }

      function setBodyScrollLock(isLocked) {
        document.body.style.overflow = isLocked ? 'hidden' : '';
      }

      function closeAppModal(modal) {
        if (!modal) return;
        modal.classList.remove('active');
        modal.hidden = true;
        modal.setAttribute('aria-hidden', 'true');
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        modal.style.opacity = '0';
        modal.style.pointerEvents = 'none';
        setBodyScrollLock(false);
      }

      function openAppModal(modal) {
        if (!modal) return;
        modal.hidden = false;
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        modal.style.pointerEvents = 'auto';
        setBodyScrollLock(true);

        if (modal.id === 'settingsModal' && typeof SettingsManager !== 'undefined') {
          SettingsManager.updateSettingsUI();
        }

      }

      window.openHomepageModal = function(modalId) {
        if (!modalId) return;
        if (typeof window.setModalState === 'function') {
          window.setModalState(modalId, true);
        } else {
          openAppModal(document.getElementById(modalId));
        }
      };


      window.closeHomepageModal = function(modalId) {
        closeAppModal(document.getElementById(modalId));
      };

      // Initialize the application
      document.addEventListener('DOMContentLoaded', async function() {
        console.log('DOM fully loaded, initializing app...');
        
        // Resolve the current user session first
        const user = await resolveCurrentUser();
        updateWelcomeMessage(getUserDisplayName(user));
        
        // Initialize Auth Manager
        if (typeof SupabaseAuthManager !== 'undefined') {
          SupabaseAuthManager.init();
        }

        // Initialize Subscription Manager
        try {
          if (typeof SubscriptionManager !== 'undefined') {
            SubscriptionManager.init();
            window.openSubscriptionModal = () => SubscriptionManager.openSubscriptionModal();
          }
        } catch (e) {
          console.error('SubscriptionManager.init failed:', e);
        }
        
        // Settings Manager will auto-init from shared script
        // Update all dashboard counts without blocking modal setup
        try {
          if (typeof updateDashboardCounts === 'function') {
            await updateDashboardCounts();
            
            // Set initial sync time
            const syncTimeEl = document.getElementById('lastSyncTime');
            if (syncTimeEl) {
              syncTimeEl.textContent = `Last sync: ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
            }
            
            // Set up periodic refresh every 60 seconds
            setInterval(async () => {
              console.log('Refreshing dashboard stats...');
              await updateDashboardCounts();
              const syncTimeEl = document.getElementById('lastSyncTime');
              if (syncTimeEl) {
                syncTimeEl.textContent = `Last sync: ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
              }
            }, 60000);
          }
        } catch (e) {
          console.error('Initial dashboard counts update failed:', e);
        }

        // FAILSAFE: Force the username update directly from localStorage to ensure it overrides everything
        setTimeout(() => {
          try {
            let rawUser = localStorage.getItem('currentUser') || localStorage.getItem('loginUser');
            if (rawUser && rawUser !== 'guest') {
              let username = 'Student';
              if (rawUser.trim().startsWith('{')) {
                const parsed = JSON.parse(rawUser);
                username = parsed.username || parsed.firstName || parsed.name || (parsed.email ? parsed.email.split('@')[0] : 'Student');
              } else {
                username = rawUser.replace(/['"]/g, '').trim();
                if (username.includes('@')) username = username.split('@')[0];
              }
              if (username && username !== 'Student') {
                const wMsg = document.getElementById('welcomeMsg');
                const iChip = document.getElementById('userIdentityChip');
                if (wMsg) wMsg.textContent = `Ready to win the week, ${username}?`;
                if (iChip) iChip.innerHTML = `<i class="fas fa-user"></i> Signed in as ${username}`;
                
                // ALSO UPDATE ANY GREETING TAG JUST IN CASE
                const greetMsg = document.getElementById('greeting');
                if (greetMsg) greetMsg.textContent = `Welcome, ${username}!`;
              }
            }
          } catch(e) { console.error('Failsafe username update failed', e); }
        }, 500);

        const settingsBtn = document.getElementById('settingsBtn');
        const toolsBtn = document.getElementById('toolsBtn');
        const toolsModal = document.getElementById('toolsModal');
        const settingsModal = document.getElementById('settingsModal');
        const appModals = [toolsModal, settingsModal];

        document.querySelectorAll('[data-modal-target]').forEach(trigger => {
          trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const modalId = trigger.getAttribute('data-modal-target');
            openAppModal(document.getElementById(modalId));
          });
        });

        document.querySelectorAll('[data-close-modal]').forEach(trigger => {
          trigger.addEventListener('click', () => {
            closeAppModal(document.getElementById(trigger.getAttribute('data-close-modal')));
          });
        });

        appModals.forEach(modal => {
          if (modal) {
            modal.addEventListener('click', (e) => {
              if (e.target === modal) {
                closeAppModal(modal);
              }
            });
          }
        });

        document.addEventListener('keydown', (e) => {
          if (e.key !== 'Escape') return;
          const activeModal = appModals.find(modal => modal && modal.classList.contains('active'));
          if (activeModal) closeAppModal(activeModal);
        });

        // Bottom nav active state
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
          item.addEventListener('click', () => {
            if (item.id === 'toolsBtn' || item.id === 'settingsBtn') return;
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
          });
        });

        // Save settings before page unload

        
        // Make managers globally accessible

        window.SubscriptionManager = SubscriptionManager;

        // Initialize Notifications
        if (window.AceNotifications) {
          window.AceNotifications.init();
        }

        // Update Dashboard Stats & Activity
        try {
          updateDashboardCounts();
        } catch (e) {
          console.error('Dashboard refresh failed:', e);
        }

        // Handle URL Hash for deep linking
        const handleHash = () => {
          const hash = window.location.hash;
          if (hash === '#settings' && settingsBtn) {
            settingsBtn.click();
          } else if (hash === '#tools' && toolsBtn) {
            toolsBtn.click();
          }
        };

        // Check hash on load
        handleHash();

        // Listen for hash changes
        window.addEventListener('hashchange', handleHash);


      });
  