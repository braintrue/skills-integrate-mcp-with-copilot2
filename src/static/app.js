document.addEventListener("DOMContentLoaded", () => {
  // Auth state management
  let authToken = localStorage.getItem("authToken");
  let currentUser = null;

  // DOM elements
  const loginModal = document.getElementById("login-modal");
  const registerModal = document.getElementById("register-modal");
  const loginBtn = document.getElementById("login-btn");
  const registerBtn = document.getElementById("register-btn");
  const authLoginBtn = document.getElementById("auth-login-btn");
  const authRegisterBtn = document.getElementById("auth-register-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loggedOutNav = document.getElementById("logged-out-nav");
  const loggedInNav = document.getElementById("logged-in-nav");
  const usernameSpan = document.getElementById("username");
  const authRequired = document.getElementById("auth-required");
  const mainContent = document.getElementById("main-content");
  const activitiesList = document.getElementById("activities-list");
  const messageDiv = document.getElementById("message");

  // Modal management
  function showModal(modal) {
    modal.classList.remove("hidden");
  }

  function hideModal(modal) {
    modal.classList.add("hidden");
  }

  // Close modals when clicking outside or on close button
  [loginModal, registerModal].forEach(modal => {
    const closeBtn = modal.querySelector(".close");
    closeBtn.addEventListener("click", () => hideModal(modal));
    
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        hideModal(modal);
      }
    });
  });

  // Auth event listeners
  loginBtn.addEventListener("click", () => showModal(loginModal));
  registerBtn.addEventListener("click", () => showModal(registerModal));
  authLoginBtn.addEventListener("click", () => showModal(loginModal));
  authRegisterBtn.addEventListener("click", () => showModal(registerModal));

  // Logout functionality
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("authToken");
    authToken = null;
    currentUser = null;
    updateAuthUI();
  });

  // Update UI based on authentication state
  function updateAuthUI() {
    if (authToken && currentUser) {
      loggedOutNav.classList.add("hidden");
      loggedInNav.classList.remove("hidden");
      usernameSpan.textContent = currentUser.username;
      authRequired.classList.add("hidden");
      mainContent.classList.remove("hidden");
      fetchActivities();
    } else {
      loggedOutNav.classList.remove("hidden");
      loggedInNav.classList.add("hidden");
      authRequired.classList.remove("hidden");
      mainContent.classList.add("hidden");
    }
  }

  // Authentication functions
  async function getCurrentUser() {
    if (!authToken) return null;
    
    try {
      const response = await fetch("/me", {
        headers: {
          "Authorization": `Bearer ${authToken}`
        }
      });
      
      if (response.ok) {
        return await response.json();
      } else {
        localStorage.removeItem("authToken");
        authToken = null;
        return null;
      }
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  // Login form handler
  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;
    const loginMessage = document.getElementById("login-message");

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();

      if (response.ok) {
        authToken = result.access_token;
        localStorage.setItem("authToken", authToken);
        currentUser = await getCurrentUser();
        hideModal(loginModal);
        updateAuthUI();
        document.getElementById("login-form").reset();
      } else {
        loginMessage.textContent = result.detail || "Login failed";
        loginMessage.className = "error";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "Login failed. Please try again.";
      loginMessage.className = "error";
      loginMessage.classList.remove("hidden");
      console.error("Login error:", error);
    }
  });

  // Register form handler
  document.getElementById("register-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const username = document.getElementById("register-username").value;
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;
    const registerMessage = document.getElementById("register-message");

    try {
      const response = await fetch("/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, email, password })
      });

      const result = await response.json();

      if (response.ok) {
        registerMessage.textContent = "Registration successful! Please login.";
        registerMessage.className = "success";
        registerMessage.classList.remove("hidden");
        document.getElementById("register-form").reset();
        
        setTimeout(() => {
          hideModal(registerModal);
          showModal(loginModal);
        }, 2000);
      } else {
        registerMessage.textContent = result.detail || "Registration failed";
        registerMessage.className = "error";
        registerMessage.classList.remove("hidden");
      }
    } catch (error) {
      registerMessage.textContent = "Registration failed. Please try again.";
      registerMessage.className = "error";
      registerMessage.classList.remove("hidden");
      console.error("Registration error:", error);
    }
  });

  // Fetch and display activities
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      activitiesList.innerHTML = "";

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;
        const isUserSignedUp = currentUser && details.participants.includes(currentUser.email);
        const isFull = spotsLeft === 0;

        const participantsHTML = details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants.map(email => `<li>${email}</li>`).join("")}
              </ul>
            </div>`
          : `<p><em>No participants yet</em></p>`;

        const actionsHTML = `
          <div class="activity-actions">
            ${isUserSignedUp 
              ? `<button class="unregister-btn" data-activity="${name}">Unregister</button>`
              : `<button class="signup-btn" data-activity="${name}" ${isFull ? 'disabled' : ''}>${isFull ? 'Full' : 'Sign Up'}</button>`
            }
          </div>
        `;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
          ${actionsHTML}
        `;

        activitiesList.appendChild(activityCard);
      });

      // Add event listeners for action buttons
      document.querySelectorAll(".signup-btn").forEach(btn => {
        btn.addEventListener("click", handleSignup);
      });

      document.querySelectorAll(".unregister-btn").forEach(btn => {
        btn.addEventListener("click", handleUnregister);
      });

    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle activity signup
  async function handleSignup(event) {
    const activityName = event.target.getAttribute("data-activity");
    
    try {
      const response = await fetch(`/activities/${encodeURIComponent(activityName)}/signup`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`
        }
      });

      const result = await response.json();
      showMessage(result.message, response.ok ? "success" : "error");

      if (response.ok) {
        fetchActivities(); // Refresh the activities list
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Signup error:", error);
    }
  }

  // Handle activity unregister
  async function handleUnregister(event) {
    const activityName = event.target.getAttribute("data-activity");
    
    try {
      const response = await fetch(`/activities/${encodeURIComponent(activityName)}/unregister`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${authToken}`
        }
      });

      const result = await response.json();
      showMessage(result.message, response.ok ? "success" : "error");

      if (response.ok) {
        fetchActivities(); // Refresh the activities list
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Unregister error:", error);
    }
  }

  // Show messages
  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Initialize app
  async function init() {
    if (authToken) {
      currentUser = await getCurrentUser();
    }
    updateAuthUI();
  }

  init();
});
