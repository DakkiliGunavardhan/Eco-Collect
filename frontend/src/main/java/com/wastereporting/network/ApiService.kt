package com.wastereporting.network

import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.engine.okhttp.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.plugins.logging.*
import io.ktor.client.request.*
import io.ktor.client.request.forms.*
import io.ktor.client.statement.HttpResponse
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.time.LocalDateTime
import java.time.ZonedDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import android.os.Build

@Serializable
data class IssueReportCreatePayload(
    val title: String?,
    val category: String,
    val description: String?,
    val latitude: Double,
    val longitude: Double,
    val address: String?,
    val location: String?,
    val image_url: String?
)

/**
 * ApiService — Connected to Python FastAPI backend using Ktor Client.
 */
object ApiService {

    private val client = HttpClient(OkHttp) {
        engine {
            config {
                connectTimeout(2, java.util.concurrent.TimeUnit.SECONDS)
                readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                writeTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
            }
        }
        install(ContentNegotiation) {
            json(Json {
                ignoreUnknownKeys = true
                isLenient = true
                encodeDefaults = true
            })
        }
        install(Logging) {
            level = LogLevel.INFO
        }
    }

    // DEVELOPMENT ONLY: Configure based on environment:
    // • Physical Device (ADB Reverse) -> "http://127.0.0.1:8000/api"
    // • Physical Device (Direct Wi-Fi) -> "http://10.52.246.34:8000/api" or "http://172.23.48.137:8000/api"
    // • Android Emulator              -> "http://10.0.2.2:8000/api"
    // • Production                    -> "https://api.ecocollect.city/api"
    var customBaseUrl: String? = null
    var detectedWorkingBaseUrl: String? = null

    fun isEmulator(): Boolean {
        return try {
            Build.FINGERPRINT.startsWith("generic")
                    || Build.FINGERPRINT.startsWith("unknown")
                    || Build.MODEL.contains("google_sdk")
                    || Build.MODEL.contains("Emulator")
                    || Build.MODEL.contains("Android SDK built for x86")
                    || Build.MANUFACTURER.contains("Genymotion")
                    || (Build.BRAND.startsWith("generic") && Build.DEVICE.startsWith("generic"))
                    || "google_sdk" == Build.PRODUCT
        } catch (e: Throwable) {
            false
        }
    }

    val candidateUrls: List<String>
        get() = listOfNotNull(
            customBaseUrl,
            detectedWorkingBaseUrl,
            "http://127.0.0.1:8000/api",
            if (isEmulator()) "http://10.0.2.2:8000/api" else null,
            "http://10.0.2.2:8000/api",
            "http://10.52.246.34:8000/api",
            "http://172.23.48.137:8000/api",
            "http://10.108.204.34:8000/api",
            "http://192.168.56.1:8000/api",
            "http://192.168.73.1:8000/api",
            "http://192.168.50.1:8000/api"
        ).distinct()

    val BASE_URL: String
        get() = customBaseUrl ?: detectedWorkingBaseUrl ?: candidateUrls.first()

    fun getFullImageUrl(url: String): String {
        if (url.startsWith("http://") || url.startsWith("https://")) {
            return url
        }
        val serverRoot = BASE_URL.removeSuffix("/api")
        val cleanUrl = if (url.startsWith("/")) url else "/$url"
        return "$serverRoot$cleanUrl"
    }

    fun formatIsoDateTimeToIndian(isoString: String?): String {
        if (isoString.isNullOrBlank()) return "Unknown Date"
        return try {
            val formatter = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a", Locale.ENGLISH)
            
            if (isoString.contains("Z") || isoString.contains("+") || (isoString.indexOf("-", 10) != -1)) {
                val zonedDateTime = ZonedDateTime.parse(isoString)
                val indiaDateTime = zonedDateTime.withZoneSameInstant(ZoneId.of("Asia/Kolkata"))
                indiaDateTime.format(formatter)
            } else {
                val localDateTime = LocalDateTime.parse(isoString)
                localDateTime.format(formatter)
            }
        } catch (e: Exception) {
            try {
                isoString.replace("T", " ")
            } catch (ex: Exception) {
                isoString
            }
        }
    }

    private fun HttpRequestBuilder.bearerAuth() {
        TokenManager.jwtToken?.let { token ->
            header("Authorization", "Bearer $token")
        }
    }

    suspend fun uploadImage(bytes: ByteArray): String? {
        val candidates = candidateUrls
        for (url in candidates) {
            try {
                val response: UploadResponse = client.submitFormWithBinaryData(
                    url = "$url/upload",
                    formData = formData {
                        append("file", bytes, Headers.build {
                            append(HttpHeaders.ContentType, "image/jpeg")
                            append(HttpHeaders.ContentDisposition, "filename=\"upload.jpg\"")
                        })
                    }
                ).body()
                detectedWorkingBaseUrl = url
                return response.file_url
            } catch (e: Exception) {
                // Try next candidate
            }
        }
        return null
    }

    // ─────────────────────────────────────────────
    // HELPER FOR RESPONSE HANDLING
    // ─────────────────────────────────────────────

    private suspend inline fun <reified T> handleResponse(
        crossinline block: suspend (baseUrl: String) -> HttpResponse,
        fallbackError: String = "Request failed"
    ): Result<T> {
        val candidates = candidateUrls
        var lastException: Throwable? = null

        for (url in candidates) {
            try {
                val response = block(url)
                detectedWorkingBaseUrl = url
                if (response.status.isSuccess()) {
                    return Result.success(response.body())
                } else {
                    if (response.status == HttpStatusCode.Unauthorized) {
                        TokenManager.clearToken()
                    }
                    val errorMsg = try {
                        val bodyText = response.body<String>()
                        val json = Json { ignoreUnknownKeys = true; isLenient = true }
                        val jsonElement = json.parseToJsonElement(bodyText)
                        if (jsonElement is kotlinx.serialization.json.JsonObject) {
                            val detail = jsonElement["detail"]
                            when {
                                detail is kotlinx.serialization.json.JsonPrimitive -> detail.content
                                detail != null -> detail.toString()
                                jsonElement.containsKey("message") -> {
                                    val msg = jsonElement["message"]
                                    if (msg is kotlinx.serialization.json.JsonPrimitive) msg.content else msg.toString()
                                }
                                else -> fallbackError
                            }
                        } else {
                            fallbackError
                        }
                    } catch (e: Exception) {
                        fallbackError
                    }
                    return Result.failure(Exception(errorMsg))
                }
            } catch (e: Throwable) {
                lastException = e
                val msg = e.message ?: ""
                val isConnError = e is java.net.ConnectException ||
                        e is java.net.SocketTimeoutException ||
                        e is io.ktor.client.network.sockets.ConnectTimeoutException ||
                        e is io.ktor.client.network.sockets.SocketTimeoutException ||
                        msg.contains("timeout", ignoreCase = true) ||
                        msg.contains("Connect", ignoreCase = true) ||
                        msg.contains("Failed to connect", ignoreCase = true) ||
                        msg.contains("refused", ignoreCase = true) ||
                        msg.contains("unreachable", ignoreCase = true)
                if (!isConnError) {
                    break
                }
            }
        }

        val finalMsg = "Unable to connect to EcoCollect server. Please check your network connection or server status."
        return Result.failure(Exception(finalMsg, lastException))
    }

    private suspend inline fun <reified T> handleResponseSimple(
        crossinline block: suspend () -> HttpResponse,
        fallbackError: String = "Request failed"
    ): Result<T> = handleResponse({ _ -> block() }, fallbackError)

    // ─────────────────────────────────────────────
    // CITIZEN AUTH
    // ─────────────────────────────────────────────

    suspend fun login(request: LoginRequest): Result<AuthResponse> {
        val result = handleResponse<AuthResponse>(
            block = { baseUrl ->
                client.post("$baseUrl/auth/login") {
                    contentType(ContentType.Application.Json)
                    setBody(request)
                }
            },
            fallbackError = "Login failed"
        )
        if (result.isSuccess) {
            val response = result.getOrThrow()
            TokenManager.userRole = response.user.role
            TokenManager.jwtToken = response.token
        }
        return result
    }

    suspend fun sendOtp(request: SendOtpRequest): Result<SendOtpResponse> {
        return handleResponse<SendOtpResponse>(
            block = { baseUrl ->
                client.post("$baseUrl/auth/send-otp") {
                    contentType(ContentType.Application.Json)
                    setBody(request)
                }
            },
            fallbackError = "Failed to send OTP"
        )
    }

    suspend fun verifyOtp(email: String, otp: String): Result<AuthResponse> {
        val result = handleResponse<AuthResponse>(
            block = { baseUrl ->
                client.post("$baseUrl/auth/verify-otp") {
                    parameter("email", email)
                    parameter("otp", otp)
                }
            },
            fallbackError = "OTP verification failed"
        )
        if (result.isSuccess) {
            val response = result.getOrThrow()
            TokenManager.userRole = response.user.role
            TokenManager.jwtToken = response.token
        }
        return result
    }

    suspend fun forgotPassword(email: String): Result<Boolean> {
        return handleResponse<Unit>(
            block = { baseUrl ->
                client.post("$baseUrl/auth/forgot-password") {
                    contentType(ContentType.Application.Json)
                    setBody(mapOf("email" to email))
                }
            },
            fallbackError = "Request failed"
        ).map { true }
    }

    suspend fun verifyPasswordResetOtp(email: String, otp: String): Result<Boolean> {
        return handleResponse<Unit>(
            block = { baseUrl ->
                client.post("$baseUrl/auth/verify-otp") {
                    contentType(ContentType.Application.Json)
                    setBody(mapOf(
                        "email" to email,
                        "otp" to otp
                    ))
                }
            },
            fallbackError = "OTP verification failed"
        ).map { true }
    }

    suspend fun resetPassword(email: String, otp: String, newPassword: String): Result<Boolean> {
        return handleResponse<Unit>(
            block = { baseUrl ->
                client.post("$baseUrl/auth/reset-password") {
                    contentType(ContentType.Application.Json)
                    setBody(mapOf(
                        "email" to email,
                        "otp" to otp,
                        "new_password" to newPassword
                    ))
                }
            },
            fallbackError = "Failed to reset password"
        ).map { true }
    }

    suspend fun register(request: RegisterRequest): Result<AuthResponse> {
        val result = handleResponse<AuthResponse>(
            block = { baseUrl ->
                client.post("$baseUrl/auth/register") {
                    contentType(ContentType.Application.Json)
                    setBody(request)
                }
            },
            fallbackError = "Registration failed"
        )
        if (result.isSuccess) {
            val response = result.getOrThrow()
            TokenManager.userRole = response.user.role
            TokenManager.jwtToken = response.token
        }
        return result
    }

    // ─────────────────────────────────────────────
    // SUPERVISOR AUTH
    // ─────────────────────────────────────────────

    suspend fun supervisorLogin(request: SupervisorLoginRequest): Result<SupervisorAuthResponse> {
        val result = handleResponse<SupervisorAuthResponse>(
            block = { baseUrl ->
                client.post("$baseUrl/auth/supervisor/login") {
                    contentType(ContentType.Application.Json)
                    setBody(request)
                }
            },
            fallbackError = "Supervisor login failed"
        )
        if (result.isSuccess) {
            val response = result.getOrThrow()
            TokenManager.userRole = "supervisor"
            TokenManager.jwtToken = response.token
        }
        return result
    }

    suspend fun supervisorRegister(request: SupervisorRegisterRequest): Result<SupervisorAuthResponse> {
        return handleResponse<SupervisorAuthResponse>(
            block = { baseUrl ->
                client.post("$baseUrl/auth/supervisor/register") {
                    contentType(ContentType.Application.Json)
                    bearerAuth()
                    setBody(request)
                }
            },
            fallbackError = "Supervisor registration failed"
        )
    }

    // ─────────────────────────────────────────────
    // PROFILE
    // ─────────────────────────────────────────────

    suspend fun getProfile(): Result<User> {
        return handleResponse<User>(
            block = { baseUrl ->
                client.get("$baseUrl/profile") {
                    bearerAuth()
                }
            },
            fallbackError = "Failed to load profile"
        )
    }

    suspend fun updateProfile(data: Map<String, String>, imageBytes: ByteArray? = null): Result<User> {
        return try {
            var imageUrl: String? = null
            if (imageBytes != null && imageBytes.isNotEmpty()) {
                imageUrl = uploadImage(imageBytes)
            }
            
            val payload = data.toMutableMap()
            if (imageUrl != null) {
                payload["profile_image_url"] = imageUrl
            }
            
            handleResponse<User>(
                block = { baseUrl ->
                    client.put("$baseUrl/profile") {
                        contentType(ContentType.Application.Json)
                        setBody(payload)
                        bearerAuth()
                    }
                },
                fallbackError = "Failed to update profile"
            )
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ─────────────────────────────────────────────
    // CITIZEN
    // ─────────────────────────────────────────────

    suspend fun getCitizenDashboard(): Result<CitizenDashboardResponse> {
        return handleResponse<CitizenDashboardResponse>(
            block = { baseUrl ->
                client.get("$baseUrl/citizen/dashboard") {
                    bearerAuth()
                }
            },
            fallbackError = "Failed to load dashboard data"
        )
    }

    suspend fun submitIssue(
        category: String,
        description: String,
        latitude: Double,
        longitude: Double,
        address: String,
        imagesList: List<ByteArray> = emptyList()
    ): Result<IssueReport> {
        return try {
            val uploadedUrls = mutableListOf<String>()
            for (bytes in imagesList) {
                if (bytes.isNotEmpty()) {
                    val url = uploadImage(bytes)
                    if (url != null) {
                        uploadedUrls.add(url)
                    }
                }
            }
            
            val finalImageUrl = if (uploadedUrls.isNotEmpty()) {
                uploadedUrls.joinToString(",")
            } else {
                null
            }
            
            val payload = IssueReportCreatePayload(
                title = category,
                category = category,
                description = description,
                latitude = latitude,
                longitude = longitude,
                address = address,
                location = address,
                image_url = finalImageUrl
            )
            
            handleResponse<IssueReport>(
                block = { baseUrl ->
                    client.post("$baseUrl/citizen/issues") {
                        contentType(ContentType.Application.Json)
                        setBody(payload)
                        bearerAuth()
                    }
                },
                fallbackError = "Failed to submit report"
            )
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getIssues(): Result<List<IssueReport>> {
        return handleResponse<List<IssueReport>>(
            block = { baseUrl ->
                client.get("$baseUrl/citizen/issues") {
                    bearerAuth()
                }
            },
            fallbackError = "Failed to load reports"
        )
    }

    suspend fun getReportById(reportId: Int): Result<SingleReportResponse> {
        return handleResponse<SingleReportResponse>(
            block = { baseUrl ->
                client.get("$baseUrl/issues/$reportId") {
                    bearerAuth()
                }
            },
            fallbackError = "Failed to load report details"
        )
    }

    // ─────────────────────────────────────────────
    // SUPERVISOR
    // ─────────────────────────────────────────────

    suspend fun getSupervisorDashboard(): Result<SupervisorDashboardResponse> {
        return handleResponse<SupervisorDashboardResponse>(
            block = { baseUrl ->
                client.get("$baseUrl/supervisor/dashboard") {
                    bearerAuth()
                }
            },
            fallbackError = "Failed to load dashboard"
        )
    }

    suspend fun getSupervisorReports(status: String? = null): Result<List<IssueReport>> {
        return handleResponse<List<IssueReport>>(
            block = { baseUrl ->
                client.get("$baseUrl/supervisor/issues") {
                    if (!status.isNullOrBlank() && status != "All") {
                        parameter("status", status)
                    }
                    bearerAuth()
                }
            },
            fallbackError = "Failed to load supervisor reports"
        )
    }

    suspend fun getSupervisorNearbyReports(): Result<List<IssueReport>> {
        return handleResponse<List<IssueReport>>(
            block = { baseUrl ->
                client.get("$baseUrl/supervisor/issues/nearby") {
                    bearerAuth()
                }
            },
            fallbackError = "Failed to load nearby reports"
        )
    }

    suspend fun completeIssue(issueId: Int, completionImageUrl: String?, remarks: String? = null): Result<Boolean> {
        return handleResponse<Unit>(
            block = { baseUrl ->
                client.put("$baseUrl/supervisor/issues/$issueId/complete") {
                    completionImageUrl?.let { parameter("completion_image_url", it) }
                    remarks?.let { parameter("remarks", it) }
                    bearerAuth()
                }
            },
            fallbackError = "Failed to complete issue"
        ).map { true }
    }

    // ─────────────────────────────────────────────
    // ADMIN
    // ─────────────────────────────────────────────

    suspend fun getAdminDashboard(): Result<AdminDashboardResponse> {
        return handleResponse<AdminDashboardResponse>(
            block = { baseUrl ->
                client.get("$baseUrl/admin/dashboard") {
                    bearerAuth()
                }
            },
            fallbackError = "Failed to load admin dashboard"
        )
    }

    suspend fun getAdminReports(): Result<List<IssueReport>> {
        return handleResponse<List<IssueReport>>(
            block = { baseUrl ->
                client.get("$baseUrl/admin/issues") {
                    bearerAuth()
                }
            },
            fallbackError = "Failed to load reports"
        )
    }

    suspend fun assignReport(reportId: Int, supervisorId: Int): Result<Boolean> {
        return handleResponse<Unit>(
            block = { baseUrl ->
                client.put("$baseUrl/admin/issues/$reportId/assign") {
                    parameter("supervisor_id", supervisorId)
                    bearerAuth()
                }
            },
            fallbackError = "Failed to assign report"
        ).map { true }
    }

    suspend fun getAdminSupervisors(): Result<List<AdminSupervisorStats>> {
        return handleResponse<List<AdminSupervisorStats>>(
            block = { baseUrl ->
                client.get("$baseUrl/admin/supervisors") {
                    bearerAuth()
                }
            },
            fallbackError = "Failed to load supervisors list"
        )
    }

    suspend fun updateSupervisor(supervisorId: Int, request: SupervisorUpdateRequest): Result<Boolean> {
        return handleResponse<Unit>(
            block = { baseUrl ->
                client.put("$baseUrl/admin/supervisors/$supervisorId") {
                    contentType(ContentType.Application.Json)
                    setBody(request)
                    bearerAuth()
                }
            },
            fallbackError = "Failed to update supervisor"
        ).map { true }
    }

    suspend fun toggleSupervisorStatus(supervisorId: Int): Result<Boolean> {
        return handleResponse<Unit>(
            block = { baseUrl ->
                client.put("$baseUrl/admin/supervisors/$supervisorId/toggle-status") {
                    bearerAuth()
                }
            },
            fallbackError = "Failed to toggle supervisor status"
        ).map { true }
    }

    suspend fun getAdminHeatmap(): Result<AdminHeatmapResponse> {
        return handleResponse<AdminHeatmapResponse>(
            block = { baseUrl ->
                client.get("$baseUrl/admin/heatmap") {
                    bearerAuth()
                }
            },
            fallbackError = "Failed to load heatmap data"
        )
    }

    // ─────────────────────────────────────────────
    // NOTIFICATIONS
    // ─────────────────────────────────────────────

    suspend fun getNotifications(): Result<List<Notification>> {
        return handleResponse<List<Notification>>(
            block = { baseUrl ->
                client.get("$baseUrl/notifications") {
                    bearerAuth()
                }
            },
            fallbackError = "Failed to load notifications"
        )
    }

    suspend fun markNotificationRead(id: Int): Result<Boolean> {
        return handleResponse<Unit>(
            block = { baseUrl ->
                client.put("$baseUrl/notifications/$id/read") {
                    bearerAuth()
                }
            },
            fallbackError = "Failed to mark notification as read"
        ).map { true }
    }

    // ─────────────────────────────────────────────
    // ANALYTICS
    // ─────────────────────────────────────────────

    suspend fun getAdminAnalytics(): Result<AdminAnalyticsResponse> {
        return handleResponse<AdminAnalyticsResponse>(
            block = { baseUrl ->
                client.get("$baseUrl/admin/analytics") {
                    bearerAuth()
                }
            },
            fallbackError = "Failed to load analytics data"
        )
    }

    suspend fun updateSupervisorLocation(latitude: Double, longitude: Double): Result<Boolean> {
        return handleResponse<Unit>(
            block = { baseUrl ->
                client.put("$baseUrl/supervisor/location") {
                    parameter("latitude", latitude)
                    parameter("longitude", longitude)
                    bearerAuth()
                }
            },
            fallbackError = "Failed to update location"
        ).map { true }
    }

    suspend fun getDrivingRoute(
        startLat: Double,
        startLng: Double,
        endLat: Double,
        endLng: Double
    ): Result<RouteDetails> {
        return try {
            val response: HttpResponse = client.get("https://router.project-osrm.org/route/v1/driving/$startLng,$startLat;$endLng,$endLat") {
                parameter("overview", "full")
                parameter("geometries", "geojson")
            }
            if (response.status.isSuccess()) {
                val bodyText = response.body<String>()
                val osrmResponse = Json { ignoreUnknownKeys = true }.decodeFromString<OsrmResponse>(bodyText)
                val route = osrmResponse.routes.firstOrNull()
                val coordinates = route?.geometry?.coordinates
                val duration = route?.duration ?: 0.0
                val distance = route?.distance ?: 0.0
                if (coordinates != null) {
                    val path = coordinates.map { Pair(it[1], it[0]) }
                    Result.success(RouteDetails(path, duration, distance))
                } else {
                    Result.failure(Exception("No route geometry found"))
                }
            } else {
                Result.failure(Exception("Failed to fetch route from OSRM: ${response.status}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun changePassword(currentPassword: String, newPassword: String): Result<Boolean> {
        return handleResponse<Unit>(
            block = { baseUrl ->
                client.put("$baseUrl/change-password") {
                    contentType(ContentType.Application.Json)
                    setBody(mapOf("current_password" to currentPassword, "new_password" to newPassword))
                    bearerAuth()
                }
            },
            fallbackError = "Failed to change password"
        ).map { true }
    }
}
