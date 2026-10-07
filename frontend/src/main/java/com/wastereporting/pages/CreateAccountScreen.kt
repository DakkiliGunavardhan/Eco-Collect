package com.wastereporting.pages

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.foundation.Image
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wastereporting.network.ApiService
import kotlinx.coroutines.launch
import androidx.compose.ui.res.painterResource
import com.wastereporting.R

private fun formatMillis(millis: Long?): String {
    if (millis == null) return ""
    val totalDays = (millis / (1000 * 60 * 60 * 24)).toInt()
    var days = totalDays
    var year = 1970
    while (true) {
        val daysInYear = if (year % 4 == 0 && (year % 100 != 0 || year % 400 == 0)) 366 else 365
        if (days >= daysInYear) {
            days -= daysInYear
            year++
        } else {
            break
        }
    }
    val leapYear = (year % 4 == 0 && (year % 100 != 0 || year % 400 == 0))
    val daysInMonth = intArrayOf(31, if (leapYear) 29 else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)
    var month = 0
    while (month < 12) {
        if (days >= daysInMonth[month]) {
            days -= daysInMonth[month]
            month++
        } else {
            break
        }
    }
    val d = days + 1
    val m = month + 1
    return "$year-${if (m < 10) "0$m" else m}-${if (d < 10) "0$d" else d}"
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateAccountScreen(
    onBack: () -> Unit,
    onContinue: (String) -> Unit
) {
    val scrollState = rememberScrollState()
    
    var fullName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var dob by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    
    var passwordVisible by remember { mutableStateOf(false) }
    var confirmPasswordVisible by remember { mutableStateOf(false) }
    
    var showDatePicker by remember { mutableStateOf(false) }
    
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val coroutineScope = rememberCoroutineScope()

    // OTP Verification States
    var otpInput by remember { mutableStateOf("") }
    var sentOtp by remember { mutableStateOf<String?>(null) }
    var isOtpSent by remember { mutableStateOf(false) }
    var isEmailVerified by remember { mutableStateOf(false) }
    var isSendingOtp by remember { mutableStateOf(false) }
    var isVerifyingOtp by remember { mutableStateOf(false) }
    var otpTimer by remember { mutableStateOf(60) }
    var isOtpExpired by remember { mutableStateOf(false) }
    var otpMessage by remember { mutableStateOf<String?>(null) }
    var otpError by remember { mutableStateOf<String?>(null) }

    // Countdown Timer for OTP Expiration
    LaunchedEffect(isOtpSent, otpTimer, isEmailVerified) {
        if (isOtpSent && !isEmailVerified && otpTimer > 0) {
            kotlinx.coroutines.delay(1000L)
            otpTimer -= 1
            if (otpTimer == 0) {
                isOtpExpired = true
                otpError = "OTP has expired. Please request a new OTP."
            }
        }
    }

    fun validateEmailForOtp(): String? {
        val trimmedEmail = email.trim()
        if (trimmedEmail.isBlank()) {
            return "Please enter an email address before sending OTP"
        }
        val emailPattern = Regex("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")
        if (!emailPattern.matches(trimmedEmail)) {
            return "Please enter a valid email address (e.g. user@example.com)"
        }
        return null
    }

    fun validateFormForSignup(): String? {
        if (fullName.isBlank() || email.isBlank() || phone.isBlank() || dob.isBlank() || password.isBlank() || confirmPassword.isBlank()) {
            return "All fields are required"
        }
        val trimmedName = fullName.trim()
        val nameRegex = Regex("^(?!.*[.\\-']{2})(?!.* {2})[a-zA-Z][a-zA-Z\\s.\\-']*[a-zA-Z]$")
        if (trimmedName.length < 3 || trimmedName.length > 100 || !nameRegex.matches(trimmedName)) {
            return "Please enter a valid full name. Only letters, spaces, '.', '-', and apostrophes are allowed."
        }
        val trimmedEmail = email.trim()
        val emailPattern = Regex("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")
        if (!emailPattern.matches(trimmedEmail)) {
            return "Please enter a valid email address"
        }
        if (!phone.matches(Regex("^[6-9]\\d{9}$"))) {
            return "Phone must be exactly 10 digits and start with 6, 7, 8, or 9"
        }
        if (password.length < 8) {
            return "Password must be at least 8 characters"
        }
        if (password != confirmPassword) {
            return "Passwords do not match"
        }
        return null
    }

    val sendOtpAction: () -> Unit = {
        val formErr = validateFormForSignup()
        if (formErr != null) {
            errorMessage = formErr
        } else {
            errorMessage = null
            otpError = null
            otpMessage = null
            isSendingOtp = true
            coroutineScope.launch {
                val res = ApiService.sendOtp(
                    com.wastereporting.network.SendOtpRequest(
                        full_name = fullName.trim(),
                        email = email.trim(),
                        phone = phone,
                        dob = dob,
                        password = password
                    )
                )
                isSendingOtp = false
                if (res.isSuccess) {
                    val responseData = res.getOrNull()
                    sentOtp = responseData?.otp
                    isOtpSent = true
                    isOtpExpired = false
                    otpTimer = 60
                    otpInput = ""
                    otpMessage = "OTP sent to ${email.trim()}. Please check your email."
                } else {
                    val errorStr = res.exceptionOrNull()?.message ?: "Failed to send OTP"
                    if (errorStr.contains("already registered", ignoreCase = true) || errorStr.contains("exists", ignoreCase = true)) {
                        errorMessage = "Email already registered."
                    } else {
                        errorMessage = errorStr
                    }
                }
            }
        }
    }

    val verifyOtpAction: () -> Unit = {
        if (isOtpExpired || otpTimer <= 0) {
            otpError = "OTP has expired. Please request a new OTP."
        } else if (otpInput.trim().length != 6) {
            otpError = "Please enter a valid 6-digit code"
        } else {
            isVerifyingOtp = true
            otpError = null
            otpMessage = null
            coroutineScope.launch {
                val entered = otpInput.trim()
                val isSuccess = (sentOtp != null && entered == sentOtp)
                if (isSuccess) {
                    isVerifyingOtp = false
                    isEmailVerified = true
                    otpMessage = "✓ Email verified successfully!"
                    otpError = null
                } else {
                    val verifyRes = ApiService.verifyPasswordResetOtp(email.trim(), entered)
                    isVerifyingOtp = false
                    if (verifyRes.isSuccess) {
                        isEmailVerified = true
                        otpMessage = "✓ Email verified successfully!"
                        otpError = null
                    } else {
                        otpError = "Invalid or incorrect OTP code. Please try again."
                    }
                }
            }
        }
    }

    if (showDatePicker) {
        val datePickerState = rememberDatePickerState()
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    showDatePicker = false
                    dob = formatMillis(datePickerState.selectedDateMillis)
                }) {
                    Text("OK")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDatePicker = false }) {
                    Text("Cancel")
                }
            }
        ) {
            DatePicker(state = datePickerState)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
    ) {
        // Top Bar
        Box(
            modifier = Modifier.fillMaxWidth().padding(16.dp)
        ) {
            IconButton(onClick = onBack, modifier = Modifier.align(Alignment.CenterStart)) {
                Icon(Icons.Default.ChevronLeft, contentDescription = "Back", tint = Color(0xFF1E293B))
            }
            Text(
                "Create Account",
                fontWeight = FontWeight.Bold,
                fontSize = 20.sp,
                color = Color(0xFF1E293B),
                modifier = Modifier.align(Alignment.Center)
            )
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp)
                .verticalScroll(scrollState),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(16.dp))

            // Logo
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(Color(0xFFDCFCE7)),
                contentAlignment = Alignment.Center
            ) {
                Image(
                    painter = painterResource(R.drawable.app_logo),
                    contentDescription = "Logo",
                    modifier = Modifier.size(80.dp).clip(RoundedCornerShape(20.dp))
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text("EcoCollect", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1E293B))
            Text("Create an account to continue", fontSize = 14.sp, color = Color(0xFF64748B))

            Spacer(modifier = Modifier.height(24.dp))
        
        SignUpTextField(
            label = "Full Name",
            value = fullName,
            onValueChange = { fullName = it },
            placeholder = "John Doe",
            leadingIcon = Icons.Default.AccountCircle,
            enabled = !isEmailVerified
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        SignUpTextField(
            label = "Email",
            value = email,
            onValueChange = { email = it },
            placeholder = "john@example.com",
            leadingIcon = Icons.Default.Email,
            enabled = !isEmailVerified
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        SignUpTextField(
            label = "Phone Number",
            value = phone,
            onValueChange = { phone = it },
            placeholder = "+1 234 567 8900",
            leadingIcon = Icons.Default.Phone,
            enabled = !isEmailVerified
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        SignUpTextField(
            label = "Date of Birth",
            value = dob,
            onValueChange = { dob = it },
            placeholder = "Select Date of Birth",
            leadingIcon = Icons.Default.CalendarToday,
            onClick = if (!isEmailVerified) { { showDatePicker = true } } else null,
            enabled = !isEmailVerified
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        SignUpTextField(
            label = "Password",
            value = password,
            onValueChange = { password = it },
            placeholder = "••••••••",
            leadingIcon = Icons.Default.Lock,
            isPassword = true,
            passwordVisible = passwordVisible,
            onVisibilityToggle = { passwordVisible = !passwordVisible },
            enabled = !isEmailVerified
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        SignUpTextField(
            label = "Confirm Password",
            value = confirmPassword,
            onValueChange = { confirmPassword = it },
            placeholder = "••••••••",
            leadingIcon = Icons.Default.Lock,
            isPassword = true,
            passwordVisible = confirmPasswordVisible,
            onVisibilityToggle = { confirmPasswordVisible = !confirmPasswordVisible },
            enabled = !isEmailVerified
        )

        Spacer(modifier = Modifier.height(20.dp))

        // OTP Verification Section
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(if (isEmailVerified) Color(0xFFF0FDF4) else Color(0xFFF8FAFC))
                .padding(16.dp)
        ) {
            if (isEmailVerified) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = "Verified",
                        tint = Color(0xFF16A34A),
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        "✓ Email Verified Successfully",
                        color = Color(0xFF15803D),
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp
                    )
                }
            } else if (!isOtpSent) {
                Button(
                    onClick = sendOtpAction,
                    enabled = !isSendingOtp,
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7))
                ) {
                    if (isSendingOtp) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                    } else {
                        Icon(Icons.Default.Send, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Send Email OTP", color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                    }
                }
            } else {
                Text(
                    "Enter Email Verification OTP",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = Color(0xFF1E293B)
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "A 6-digit code was sent to ${email.trim()}",
                    fontSize = 13.sp,
                    color = Color(0xFF64748B)
                )
                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = otpInput,
                    onValueChange = { if (it.length <= 6) otpInput = it },
                    placeholder = { Text("6-Digit OTP Code", color = Color(0xFF94A3B8)) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    singleLine = true,
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                        keyboardType = androidx.compose.ui.text.input.KeyboardType.Number
                    ),
                    textStyle = LocalTextStyle.current.copy(textAlign = TextAlign.Center, fontSize = 20.sp, letterSpacing = 4.sp)
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (otpTimer > 0 && !isOtpExpired) {
                        Text(
                            "Resend OTP in ${otpTimer}s",
                            fontSize = 13.sp,
                            color = Color(0xFF64748B)
                        )
                    } else {
                        TextButton(onClick = sendOtpAction) {
                            Text("Resend OTP", color = Color(0xFF2563EB), fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                Button(
                    onClick = verifyOtpAction,
                    enabled = !isVerifyingOtp && otpInput.trim().length == 6,
                    modifier = Modifier.fillMaxWidth().height(44.dp),
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF16A34A))
                ) {
                    if (isVerifyingOtp) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(18.dp))
                    } else {
                        Text("Verify OTP", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }
                }
            }

            otpMessage?.let {
                Spacer(modifier = Modifier.height(6.dp))
                Text(it, color = Color(0xFF16A34A), fontSize = 13.sp, fontWeight = FontWeight.Medium)
            }

            otpError?.let {
                Spacer(modifier = Modifier.height(6.dp))
                Text(it, color = Color(0xFFDC2626), fontSize = 13.sp, fontWeight = FontWeight.Medium)
            }
        }

        Spacer(modifier = Modifier.height(24.dp))
        
        errorMessage?.let {
            Text(it, color = MaterialTheme.colorScheme.error, fontSize = 14.sp, modifier = Modifier.padding(bottom = 8.dp))
        }

        Button(
            onClick = {
                val validationErr = validateFormForSignup()
                if (validationErr != null) {
                    errorMessage = validationErr
                    return@Button
                }
                if (!isEmailVerified) {
                    errorMessage = "Please verify your email address via OTP before signing up."
                    return@Button
                }
                
                isLoading = true
                errorMessage = null
                coroutineScope.launch {
                    val result = ApiService.register(
                        com.wastereporting.network.RegisterRequest(
                            full_name = fullName.trim(),
                            email = email.trim(),
                            phone = phone,
                            dob = dob,
                            password = password
                        )
                    )
                    isLoading = false
                    if (result.isSuccess) {
                        onContinue(email.trim())
                    } else {
                        errorMessage = result.exceptionOrNull()?.message ?: "Registration failed"
                    }
                }
            },
            enabled = isEmailVerified && !isLoading,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF2563EB),
                disabledContainerColor = Color(0xFFCBD5E1),
                disabledContentColor = Color(0xFF64748B)
            )
        ) {
            if (isLoading) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
            else Text("Sign Up", color = Color.White, fontWeight = FontWeight.Medium, fontSize = 16.sp)
        }

        if (!isEmailVerified) {
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                "Verify email to enable Sign Up",
                fontSize = 12.sp,
                color = Color(0xFF64748B)
            )
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Already have an account? ", color = Color(0xFF64748B), fontSize = 14.sp)
            Text(
                "Click here",
                color = Color(0xFF2563EB),
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.clickable { onBack() }.padding(4.dp)
            )
        }
        
        Spacer(modifier = Modifier.height(32.dp))
    }
}
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SignUpTextField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    leadingIcon: ImageVector,
    isPassword: Boolean = false,
    passwordVisible: Boolean = false,
    onVisibilityToggle: () -> Unit = {},
    onClick: (() -> Unit)? = null,
    enabled: Boolean = true
) {
    Column {
        Text(
            text = label,
            fontSize = 14.sp,
            color = Color(0xFF475569),
            modifier = Modifier.padding(bottom = 8.dp)
        )
        Box {
            OutlinedTextField(
                value = value,
                onValueChange = onValueChange,
                placeholder = { Text(placeholder, color = Color(0xFF94A3B8)) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                enabled = enabled,
                colors = OutlinedTextFieldDefaults.colors(
                    unfocusedBorderColor = Color(0xFFE2E8F0),
                    focusedBorderColor = Color(0xFF2563EB),
                    unfocusedContainerColor = Color(0xFFF8FAFC),
                    focusedContainerColor = Color(0xFFF8FAFC),
                    disabledBorderColor = Color(0xFFE2E8F0),
                    disabledContainerColor = Color(0xFFF1F5F9),
                    disabledTextColor = Color(0xFF64748B)
                ),
                singleLine = true,
                readOnly = onClick != null || !enabled,
                leadingIcon = {
                    Icon(leadingIcon, contentDescription = null, tint = Color(0xFF94A3B8))
                },
                trailingIcon = if (isPassword) {
                    {
                        IconButton(onClick = onVisibilityToggle) {
                            Icon(
                                imageVector = if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                contentDescription = if (passwordVisible) "Hide password" else "Show password",
                                tint = Color(0xFF94A3B8)
                            )
                        }
                    }
                } else null,
                visualTransformation = if (isPassword && !passwordVisible) PasswordVisualTransformation() else VisualTransformation.None
            )
            
            if (onClick != null) {
                Box(modifier = Modifier.matchParentSize().background(Color.Transparent).clickable { onClick() })
            }
        }
    }
}
