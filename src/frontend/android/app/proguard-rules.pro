# Capacitor / Cordova bridge — must not be obfuscated
-keep class com.getcapacitor.** { *; }
-keep class org.apache.cordova.** { *; }
-keepclassmembers class com.getcapacitor.** { *; }

# Android WebView JS bridge
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface

# Prevent stripping line numbers from stack traces (useful for crash reports)
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# OkHttp / Retrofit (used by Capacitor internally)
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# Gson (used by Capacitor for JSON)
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn sun.misc.**
-keep class com.google.gson.** { *; }
