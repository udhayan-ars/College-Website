
// CampusTrack - Login Authentication
// Supabase Integration

const SUPABASE_URL = "https://lbavigzrgdkbxsxamoty.supabase.co";
const SUPABASE_KEY = "sb_publishable_CFhHp87e9yJ8loaDJ7f3eg_Axattwgj";

// Initialize Supabase
if (!window.supabase) {
    throw new Error("Supabase library not loaded. Check your HTML script order.");
}

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);

console.log("Supabase initialized successfully!");

// Get HTML Elements
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const selectedRoleInput = document.getElementById("selectedRole");
const loginButton = document.getElementById("loginButton");
const message = document.getElementById("message");
const forgotPassword = document.getElementById("forgotPassword");

// Check required elements
if (
    !loginForm ||
    !emailInput ||
    !passwordInput ||
    !selectedRoleInput ||
    !loginButton ||
    !message ||
    !forgotPassword
) {
    throw new Error("Some login HTML elements are missing. Check their IDs.");
}

// Role Selection
const roleButtons = document.querySelectorAll(".role-btn");

roleButtons.forEach((button) => {
    button.addEventListener("click", () => {
        roleButtons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");
        selectedRoleInput.value = button.dataset.role;
    });
});

// Display Messages
function showMessage(text, type = "error") {
    message.textContent = text;
    message.style.color =
        type === "success" ? "#16a34a" : "#dc2626";
}

// Login Authentication
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const selectedRole = selectedRoleInput.value;

    if (!email || !password) {
        showMessage("Please enter your email and password.");
        return;
    }
// Validate email format
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!emailPattern.test(email)) {
    showMessage("santhosh@gmail.com");
    emailInput.focus();
    return;
}

    if (!selectedRole) {
        showMessage("Please select your account type.");
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";

    try {
        const { data, error } =
            await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

        if (error) throw error;

        const user = data.user;

        const { data: profile, error: profileError } =
            await supabaseClient
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .maybeSingle();

        if (profileError) throw profileError;

        if (!profile) {
            await supabaseClient.auth.signOut();
            throw new Error("Account profile not found.");
        }

        const actualRole = (profile.role || "").toLowerCase();

        if (actualRole !== selectedRole.toLowerCase()) {
            await supabaseClient.auth.signOut();
            throw new Error(
                "Incorrect account type. Please select " +
                actualRole.toUpperCase() + "."
            );
        }

        showMessage("Login successful!", "success");

        const dashboards = {
            student: "index.html",
            admin: "index.html",
            driver: "index.html"
        };

        window.location.href = dashboards[actualRole];

    } catch (error) {
        console.error("Login Error:", error);
        showMessage(error.message || "Login failed.");
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Login to CampusTrack";
    }
});

// Forgot Password
forgotPassword.addEventListener("click", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();

    if (!email) {
        showMessage("Please enter your email first.");
        emailInput.focus();
        return;
    }

    try {
        showMessage("Sending reset email...", "success");

        const { error } =
            await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo:
                    window.location.origin + "/reset-password.html"
            });

        if (error) throw error;

        showMessage(
            "Password reset email sent!",
            "success"
        );

    } catch (error) {
        console.error("Password Reset Error:", error);
        showMessage(error.message || "Password reset failed.");
    }
});

console.log("CampusTrack Login System Ready!");