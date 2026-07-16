package com.samaqu.keyboard.ime

import android.content.Context
import android.graphics.*
import android.inputmethodservice.Keyboard
import android.inputmethodservice.KeyboardView
import android.util.AttributeSet

class SamaQuKeyboardView @JvmOverloads constructor(
    ctx: Context, attrs: AttributeSet? = null
) : KeyboardView(ctx, attrs) {

    private val dp = ctx.resources.displayMetrics.density
    private val sp = ctx.resources.displayMetrics.scaledDensity

    var isDark = true

    fun applyTheme(dark: Boolean) {
        isDark = dark
        setBackgroundColor(if (dark) 0xFF1A1F2E.toInt() else 0xFFD1D5DB.toInt())
        val bgRes = if (dark) com.samaqu.keyboard.R.drawable.key_bg else com.samaqu.keyboard.R.drawable.key_bg_light
        try {
            KeyboardView::class.java.getDeclaredField("mKeyBackground")
                .also { it.isAccessible = true }.set(this, context.getDrawable(bgRes))
        } catch (_: Exception) {}
        invalidateAllKeys()
    }

    // iOS special key: gray face
    private val facePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFADB5BD.toInt() }
    private val shadowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFF868E96.toInt() }

    // Paint for special key labels
    private val lblPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFFFFFFFF.toInt()
        textAlign = Paint.Align.CENTER
        typeface = Typeface.DEFAULT_BOLD
        isFakeBoldText = true
        strokeWidth = 0.5f
    }

    // Paint to overdraw regular key labels with correct theme color
    private val keyLblPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        textAlign = Paint.Align.CENTER
        typeface = Typeface.DEFAULT_BOLD
        isFakeBoldText = true
    }

    init {
        lblPaint.textSize = 18f * dp
        keyLblPaint.textSize = 15f * sp
        try {
            val f = KeyboardView::class.java.getDeclaredField("mPaint")
            f.isAccessible = true
            (f.get(this) as? Paint)?.let {
                it.isFakeBoldText = true
                it.typeface = Typeface.DEFAULT_BOLD
            }
        } catch (_: Exception) {}
    }

    private fun isSpecial(code: Int) =
        code == Keyboard.KEYCODE_DELETE || code == Keyboard.KEYCODE_SHIFT ||
        code == Keyboard.KEYCODE_DONE   || code == -100 || code == -101 || code == -200

    private fun specialColor(code: Int): Int {
        val shifted = keyboard?.isShifted == true
        return if (isDark) when (code) {
            Keyboard.KEYCODE_SHIFT  -> if (shifted) 0xFF1D4ED8.toInt() else 0xFFADB5BD.toInt()
            Keyboard.KEYCODE_DELETE -> 0xFFCB3234.toInt()
            Keyboard.KEYCODE_DONE   -> 0xFF1D4ED8.toInt()
            -100, -101              -> 0xFF868E96.toInt()
            -200                    -> 0xFFFFD700.toInt()
            else                    -> 0xFFADB5BD.toInt()
        } else when (code) {
            Keyboard.KEYCODE_SHIFT  -> if (shifted) 0xFF1D4ED8.toInt() else 0xFFB0B8C8.toInt()
            Keyboard.KEYCODE_DELETE -> 0xFFCB3234.toInt()
            Keyboard.KEYCODE_DONE   -> 0xFF1D4ED8.toInt()
            -100, -101              -> 0xFFB0B8C8.toInt()
            -200                    -> 0xFFFFD700.toInt()
            else                    -> 0xFFB0B8C8.toInt()
        }
    }

    private fun specialShadow(code: Int): Int {
        val shifted = keyboard?.isShifted == true
        return if (isDark) when (code) {
            Keyboard.KEYCODE_SHIFT  -> if (shifted) 0xFF1558A0.toInt() else 0xFF868E96.toInt()
            Keyboard.KEYCODE_DELETE -> 0xFF8B1A1A.toInt()
            Keyboard.KEYCODE_DONE   -> 0xFF1558A0.toInt()
            -200                    -> 0xFFB8960A.toInt()
            else                    -> 0xFF5A6169.toInt()
        } else when (code) {
            Keyboard.KEYCODE_SHIFT  -> if (shifted) 0xFF1558A0.toInt() else 0xFF8898B0.toInt()
            Keyboard.KEYCODE_DELETE -> 0xFF8B1A1A.toInt()
            Keyboard.KEYCODE_DONE   -> 0xFF1558A0.toInt()
            -200                    -> 0xFFB8960A.toInt()
            else                    -> 0xFF8898B0.toInt()
        }
    }

    private fun specialTextColor(code: Int): Int {
        return when (code) {
            -100, -101 -> 0xFFFFFFFF.toInt()
            -200       -> 0xFF1C1C1E.toInt()
            else       -> 0xFFFFFFFF.toInt()
        }
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        val pl = paddingLeft.toFloat()
        val pt = paddingTop.toFloat()
        val gap = 1.5f * dp
        val rad = 8f * dp

        keyboard?.keys?.forEach { key ->
            val code = key.codes[0]
            val l = key.x + pl + gap
            val t = key.y + pt + gap
            val r = key.x + pl + key.width - gap
            val b = key.y + pt + key.height - gap

            if (isSpecial(code)) {
                // Draw custom colored special key on top
                shadowPaint.color = specialShadow(code)
                facePaint.color   = specialColor(code)
                lblPaint.color    = specialTextColor(code)
                canvas.drawRoundRect(RectF(l, t + dp, r, b + dp), rad, rad, shadowPaint)
                canvas.drawRoundRect(RectF(l, t, r, b - dp), rad, rad, facePaint)
                key.label?.let { lbl ->
                    val cy = (t + b - dp) / 2f - (lblPaint.descent() + lblPaint.ascent()) / 2f
                    canvas.drawText(lbl.toString(), (l + r) / 2f, cy, lblPaint)
                }
                key.icon?.let { icon ->
                    val iw = icon.intrinsicWidth; val ih = icon.intrinsicHeight
                    val cx = ((l + r) / 2f).toInt(); val cy2 = ((t + b - dp) / 2f).toInt()
                    icon.setBounds(cx - iw / 2, cy2 - ih / 2, cx + iw / 2, cy2 + ih / 2)
                    icon.colorFilter = PorterDuffColorFilter(lblPaint.color, PorterDuff.Mode.SRC_IN)
                    icon.draw(canvas)
                }
            } else if (!isDark) {
                // Light theme: overdraw regular key label with dark color
                // (super.onDraw drew white text on white key — invisible)
                key.label?.let { lbl ->
                    keyLblPaint.color = 0xFF1A1F2E.toInt()
                    val cy = (t + b) / 2f - (keyLblPaint.descent() + keyLblPaint.ascent()) / 2f
                    canvas.drawText(lbl.toString(), (l + r) / 2f, cy, keyLblPaint)
                }
            }
        }
    }
}
