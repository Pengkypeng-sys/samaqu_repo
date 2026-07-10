package com.samaqu.keyboard.ui

import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.view.inputmethod.InputMethodManager
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.snackbar.Snackbar
import com.samaqu.keyboard.data.Prefs
import com.samaqu.keyboard.databinding.ActivitySettingsBinding

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

        binding.btnSave.setOnClickListener {
            prefs.apiUrl = binding.etApiUrl.text.toString().trim()
            prefs.apiKey = binding.etApiKey.text.toString().trim()
            Snackbar.make(binding.root, "Disimpan", Snackbar.LENGTH_SHORT).show()
        }

        binding.btnEnableIME.setOnClickListener {
            startActivity(Intent(Settings.ACTION_INPUT_METHOD_SETTINGS))
        }

        binding.btnSelectIME.setOnClickListener {
            getSystemService(InputMethodManager::class.java)
                ?.showInputMethodPicker()
        }
    }
}
