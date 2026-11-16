
// ==========================================
// CampusTrack - Login Authentication
// Supabase Integration
// ==========================================


// 1. Supabase Configuration
console.log("Supabase Client:", supabaseClient);

async function testSupabaseConnection() {
    const { data, error } = await supabaseClient
        .from("students")
        .select("*")
        .limit(1);

    if (error) {
        console.error("Supabase Error:", error.message);
    } else {
        console.log("Supabase Connected Successfully! 🚀");
        console.log(data);
    }
}

testSupabaseConnection();
const SUPABASE_URL = "https://lbavigzrgdkbxsxamoty.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_CFhHp87e9yJ8loaDJ7f3eg_Axattwgj";

// Initialize Supabase

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


// 2. Get HTML Elements

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const selectedRoleInput = document.getElementById("selectedRole");
const loginButton = document.getElementById("loginButton");
const message = document.getElementById("message");
const forgotPassword = document.getElementById("forgotPassword");


// 3. Role Selection

const roleButtons = document.querySelectorAll(".role-btn");

roleButtons.forEach((button) => {

    button.addEventListener("click", () => {

        roleButtons.forEach((btn) => {
            btn.classList.remove("active");
        });

        button.classList.add("active");

        selectedRoleInput.value = button.dataset.role;

    });

});


// 4. Display Messages

function showMessage(text, type = "error") {

    message.textContent = text;

    message.style.color =
        type === "success" ? "#16a34a" : "#dc2626";

}


// 5. Login Authentication

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const selectedRole = selectedRoleInput.value;

    if (!email || !password) {

        showMessage("Please enter your email and password.");

        return;

    }

    if (!selectedRole) {

        showMessage("Please select your account type.");

        return;

    }

    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";

    showMessage("Connecting to CampusTrack...", "success");

    try {

        // Authenticate user with Supabase

        const { data, error } =
            await supabaseClient.auth.signInWithPassword({

                email: email,
                password: password

            });

        if (error) {
            throw error;
        }

        const user = data.user;

        // Get user's role from profiles table

        const { data: profile, error: profileError } =
            await supabaseClient
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .maybeSingle();

        if (profileError) {
            throw profileError;
        }

        if (!profile) {

            await supabaseClient.auth.signOut();

            throw new Error(
                "Your account profile was not found. Contact the administrator."
            );

        }

        // Verify account role

        const actualRole = profile.role.toLowerCase();

        if (actualRole !== selectedRole.toLowerCase()) {

            await supabaseClient.auth.signOut();

            throw new Error(
                "Incorrect account type selected. Please choose " +
                actualRole.toUpperCase() + "."
            );

        }

        showMessage(
            "Login successful! Welcome to CampusTrack.",
            "success"
        );

        // Temporary dashboard navigation
        // All roles use the existing index.html

        const dashboards = {

            student: "index.html",

            admin: "index.html",

            driver: "index.html"

        };

        setTimeout(() => {

            window.location.href = dashboards[actualRole];

        }, 1000);

    } catch (error) {

        console.error("Login Error:", error);

        showMessage(
            error.message || "Login failed. Please try again."
        );

    } finally {

        loginButton.disabled = false;
        loginButton.textContent = "Login to CampusTrack";

    }

});


// 6. Forgot Password

forgotPassword.addEventListener("click", async (event) => {

    event.preventDefault();

    const email = emailInput.value.trim();

    if (!email) {

        showMessage("Please enter your email address first.");

        emailInput.focus();

        return;

    }

    try {

        showMessage(
            "Sending password reset email...",
            "success"
        );

        const { error } =
            await supabaseClient.auth.resetPasswordForEmail(email, {

                redirectTo:
                    window.location.origin + "/reset-password.html"

            });

        if (error) {
            throw error;
        }

        showMessage(
            "Password reset email sent! Please check your inbox.",
            "success"
        );

    } catch (error) {

        console.error("Password Reset Error:", error);

        showMessage(
            error.message || "Unable to send password reset email."
        );

    }

});


// 7. Initial Setup

console.log(
    "CampusTrack Login System Initialized Successfully!"
);