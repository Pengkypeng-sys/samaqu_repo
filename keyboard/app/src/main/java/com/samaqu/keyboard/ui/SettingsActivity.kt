package com.samaqu.keyboard.ui

import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.view.inputmethod.InputMethodManager
import android.widget.RadioGroup
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.snackbar.Snackbar
import com.samaqu.keyboard.R
import com.samaqu.keyboard.data.Prefs
import com.samaqu.keyboard.databinding.ActivitySettingsBinding
import com.samaqu.keyboard.notify.OrderPoller

class SettingsActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySettingsBinding
    private lateinit var prefs: Prefs

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        prefs = Prefs(this)
        binding.etApiUrl.setText(prefs.apiUrl)
        binding.etApiKey.setText(prefs.apiKey)
        binding.etBiteshipKey.setText(prefs.biteshipKey)

        // Restore key size selection
        val rg = binding.root.findViewById<RadioGroup>(R.id.rgKeySize)
        rg.check(if (prefs.keySize == "large") R.id.rbLarge else R.id.rbNormal)

        binding.btnSave.setOnClickListener {
            prefs.apiUrl      = binding.etApiUrl.text.toString().trim()
            prefs.apiKey      = binding.etApiKey.text.toString().trim()
            prefs.biteshipKey = binding.etBiteshipKey.text.toString().trim()
            prefs.keySize = if (rg.checkedRadioButtonId == R.id.rbLarge) "large" else "normal"
            if (prefs.apiKey.isNotBlank()) OrderPoller.schedule(this)
            Snackbar.make(binding.root, "Disimpan — restart keyboard untuk ukuran baru", Snackbar.LENGTH_SHORT).show()
        }

        binding.btnEnableIME.setOnClickListener {
            startActivity(Intent(Settings.ACTION_INPUT_METHOD_SETTINGS))
        }

        binding.btnSelectIME.setOnClickListener {
            getSystemService(InputMethodManager::class.java)?.showInputMethodPicker()
        }

        binding.btnDashboard.setOnClickListener {
            startActivity(Intent(this, DashboardActivity::class.java))
        }
    }
}
