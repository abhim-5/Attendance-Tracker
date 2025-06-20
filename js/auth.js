// js/auth.js

document.addEventListener("DOMContentLoaded", () => {
  const loginTab = document.getElementById("loginTab");
  const registerTab = document.getElementById("registerTab");
  const authForm = document.getElementById("authForm");
  const submitBtn = document.getElementById("submitBtn");
  const loader = document.getElementById("authLoader");
  const errorMsg = document.getElementById("errorMsg");

  let isLoginMode = true;

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
  });

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
        userCredential = await auth.createUserWithEmailAndPassword(email, password);
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