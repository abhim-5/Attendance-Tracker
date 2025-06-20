// js/auth.js

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

  // Initialize EmailJS with your user ID
  emailjs.init("HA3a7MR2p1tyoa3bC");

  // Switch between login/register tab
  loginTab.addEventListener("click", () => {
    isLoginMode = true;
    loginTab.classList.add("active");
    registerTab.classList.remove("active");
    submitBtn.textContent = "Login";
    errorMsg.textContent = "";
  });

  registerTab.addEventListener("click", () => {
    isLoginMode = false;
    registerTab.classList.add("active");
    loginTab.classList.remove("active");
    submitBtn.textContent = "Register";
    errorMsg.textContent = "";

    // Show code input if needed
    showCodeInput(false);
  });

  function showCodeInput(show) {
    let codeInput = document.getElementById("codeInput");
    if (show) {
      if (!codeInput) {
        codeInput = document.createElement("input");
        codeInput.type = "text";
        codeInput.id = "codeInput";
        codeInput.placeholder = "Enter verification code";
        codeInput.style.marginTop = "10px";
        authForm.insertBefore(codeInput, submitBtn);
      }
      codeInput.style.display = "block";
    } else if (codeInput) {
      codeInput.style.display = "none";
    }
  }

  // Auth form submission
  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    // Show loader
    loader.classList.remove("hidden");
    submitBtn.disabled = true;
    errorMsg.textContent = "";

    try {
      let userCredential;
      if (isLoginMode) {
        userCredential = await auth.signInWithEmailAndPassword(email, password);
      } else {
        // Registration with email verification
        if (!verificationCode) {
          // Step 1: Send code
          verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
          pendingEmail = email;
          pendingPassword = password;

          console.log({
            email: email,
            passcode: verificationCode,
            time: "15 minutes"
          });

          await emailjs.send("service_0us6ims", "template_9ib0sgj", {
            email: email,
            passcode: verificationCode,
            time: "15 minutes"
          });

          showCodeInput(true);
          errorMsg.textContent = "Verification code sent to your email. Please enter it below.";
          loader.classList.add("hidden");
          submitBtn.disabled = false;
          return;
        } else {
          // Step 2: Check code
          const codeInput = document.getElementById("codeInput");
          if (!codeInput || codeInput.value.trim() !== verificationCode) {
            throw new Error("Invalid verification code.");
          }
          // Proceed with registration
          userCredential = await auth.createUserWithEmailAndPassword(pendingEmail, pendingPassword);

          // Reset verification state
          verificationCode = null;
          pendingEmail = null;
          pendingPassword = null;
          showCodeInput(false);
        }
      }

      // Store token in localStorage (optional)
      const token = await userCredential.user.getIdToken();
      localStorage.setItem("user", JSON.stringify(userCredential.user));
      localStorage.setItem("token", token);

      // Redirect to dashboard
      window.location.href = "dashboard.html";
    } catch (err) {
      console.error(err);
      errorMsg.textContent = err.message || "Authentication failed.";
    } finally {
      loader.classList.add("hidden");
      submitBtn.disabled = false;
    }
  });
});