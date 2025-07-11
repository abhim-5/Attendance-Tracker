// js/auth.js
const auth = window.auth;

document.addEventListener("DOMContentLoaded", () => {
  const loginTab = document.getElementById("loginTab");
  const registerTab = document.getElementById("registerTab");
  const authForm = document.getElementById("authForm");
  const submitBtn = document.getElementById("submitBtn");
  const loader = document.getElementById("authLoader");
  const errorMsg = document.getElementById("errorMsg");

  let isLoginMode = true;
  let verificationCode = null;
  let pendingEmail = null;
  let pendingPassword = null;
  let recaptchaWidgetId = null;



  function toggleRegisterFields(show) {
    document.querySelectorAll('.register-only').forEach(el => {
      el.style.display = show ? "block" : "none";
      // Toggle required attribute
      if (el.id === "confirmPassword") {
        if (show) {
          el.setAttribute("required", "required");
        } else {
          el.removeAttribute("required");
        }
      }
    });
    // Change placeholders
    const passwordInput = document.getElementById("password");
    if (passwordInput) passwordInput.placeholder = show ? "Set Password" : "Password";
  }

  // Switch between login/register tab
  loginTab.addEventListener("click", () => {
    // Prevent switching to login if verification is pending
    if (verificationCode) {
      errorMsg.textContent = "Please enter the verification code to complete registration.";
      return;
    }
    isLoginMode = true;
    loginTab.classList.add("active");
    registerTab.classList.remove("active");
    submitBtn.textContent = "Login";
    errorMsg.textContent = "";

    toggleRegisterFields(false);
  });

  registerTab.addEventListener("click", async () => {
    isLoginMode = false;
    registerTab.classList.add("active");
    loginTab.classList.remove("active");
    submitBtn.textContent = "Register";
    errorMsg.textContent = "";

    toggleRegisterFields(true);

    // Check if email is already registered (if email is filled)
    const email = document.getElementById("email").value.trim();
    if (email) {
      const signInMethods = await auth.fetchSignInMethodsForEmail(email);
      if (signInMethods.length > 0) {
        errorMsg.textContent = "User already registered. Please login.";
        // Optionally, you can disable the Register button here
        submitBtn.disabled = true;
        return;
      } else {
        submitBtn.disabled = false;
      }
    }

    // Render reCAPTCHA if not already rendered
    setTimeout(() => {
      if (typeof grecaptcha !== "undefined" && recaptchaWidgetId === null) {
        recaptchaWidgetId = grecaptcha.render("recaptcha", {
          sitekey: "6LeDlWkrAAAAAKgnBjnb2c6u-vZYcBYA7qSAMKeS" 
        });
      }
    }, 300);
  });

  // Auth form submission
  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();

    loader.classList.remove("hidden");
    submitBtn.disabled = true;
    errorMsg.textContent = "";

    try {
      let userCredential;
      if (isLoginMode) {
        userCredential = await auth.signInWithEmailAndPassword(email, password);

        // Store token in localStorage (optional)
        const token = await userCredential.user.getIdToken();
        localStorage.setItem("user", JSON.stringify(userCredential.user));
        localStorage.setItem("token", token);

        // Redirect to dashboard
        window.location.href = "dashboard.html";
      } else {
        // Registration validation
        if (password !== confirmPassword) throw new Error("Passwords do not match.");

        // Check if user already exists
        const signInMethods = await auth.fetchSignInMethodsForEmail(email);
        if (signInMethods.length > 0) {
          throw new Error("User already registered. Please login.");
        }

        // reCAPTCHA validation
        const recaptchaResponse = grecaptcha.getResponse(recaptchaWidgetId);
        if (!recaptchaResponse) {
          throw new Error("Please complete the reCAPTCHA.");
        }

        // Send token to backend for verification
        const verifyRes = await fetch('https://attendance-tracker-scvl.onrender.com/verify-recaptcha', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: recaptchaResponse })
        });
        const verifyData = await verifyRes.json();
        if (!verifyData.success) {
          throw new Error("reCAPTCHA verification failed. Please try again.");
        }

        // Step 1: Send code
        verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        pendingEmail = email;
        pendingPassword = password;

        const sendCodeRes = await fetch('https://attendance-tracker-scvl.onrender.com/send-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email,
            code: verificationCode
          })
        });
        const sendCodeData = await sendCodeRes.json();
        if (!sendCodeData.success) {
          throw new Error("Failed to send verification code email.");
        }

        // Show modal for code entry
        document.getElementById("verificationModal").style.display = "flex";
        loader.classList.add("hidden");
        submitBtn.disabled = false;
      }
    } catch (err) {
      errorMsg.textContent = err.message || "Authentication failed.";
      loader.classList.add("hidden");
      submitBtn.disabled = false;
    }
  });

  // Verification modal logic
  document.getElementById("verifyCodeBtn").onclick = async function() {
    const codeInput = document.getElementById("codeInput").value.trim();
    const codeErrorMsg = document.getElementById("codeErrorMsg");
    codeErrorMsg.textContent = "";
    if (codeInput !== verificationCode) {
      codeErrorMsg.textContent = "Invalid verification code.";
      return;
    }
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(pendingEmail, pendingPassword);
      // Reset verification state
      verificationCode = null;
      pendingEmail = null;
      pendingPassword = null;
      document.getElementById("verificationModal").style.display = "none";
      // Redirect to dashboard
      window.location.href = "dashboard.html";
    } catch (err) {
      codeErrorMsg.textContent = err.message || "Registration failed.";
    }
  };

  document.getElementById("email").addEventListener("blur", async function() {
    if (!isLoginMode) {
      const email = this.value.trim();
      if (email) {
        const signInMethods = await auth.fetchSignInMethodsForEmail(email);
        if (signInMethods.length > 0) {
          errorMsg.textContent = "User already registered. Please login.";
          submitBtn.disabled = true;
        } else {
          errorMsg.textContent = "";
          submitBtn.disabled = false;
        }
      }
    }
  });
});
