package com.samaqu.keyboard.data

import android.content.Context
import androidx.room.*

@Entity(tableName = "categories")
data class CachedCategory(
    @PrimaryKey val id: Int,
    val name: String
)

@Entity(tableName = "templates")
data class CachedTemplate(
    @PrimaryKey val id: Int,
    val categoryId: Int,
    val content: String
)

data class CategoryWithTemplates(
    @Embedded val category: CachedCategory,
    @Relation(parentColumn = "id", entityColumn = "categoryId")
    val templates: List<CachedTemplate>
)

@Dao
interface TemplateDao {
    @Transaction
    @Query("SELECT * FROM categories ORDER BY name")
    suspend fun getAllWithTemplates(): List<CategoryWithTemplates>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCategories(cats: List<CachedCategory>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTemplates(templates: List<CachedTemplate>)

    @Query("DELETE FROM templates")
    suspend fun clearTemplates()

    @Query("DELETE FROM categories")
    suspend fun clearCategories()
}

@Database(entities = [CachedCategory::class, CachedTemplate::class], version = 1)
abstract class AppDatabase : RoomDatabase() {
    abstract fun templateDao(): TemplateDao

    companion object {
        @Volatile private var INSTANCE: AppDatabase? = null
        fun get(ctx: Context) = INSTANCE ?: synchronized(this) {
            INSTANCE ?: Room.databaseBuilder(ctx.applicationContext, AppDatabase::class.java, "samaqu.db")
                .build().also { INSTANCE = it }
        }
    }
}
