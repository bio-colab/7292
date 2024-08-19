import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, filters, ContextTypes
from PIL import Image, ImageEnhance, ImageFilter
import io

# قم بتعيين مفتاح الـ API الخاص بك هنا
TOKEN = "5800391808:AAE-73AgbVWHqJyQO6osM3x25Lnt_GLegzA"

# إعداد التسجيل
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

# قاموس للفلاتر المتاحة
FILTERS = {
    'sharpen': 'تحسين الحدة',
    'blur': 'تعتيم',
    'contour': 'تحديد الحواف',
    'detail': 'تفاصيل أكثر',
    'edge_enhance': 'تعزيز الحواف',
    'smooth': 'تنعيم',
    'brightness': 'زيادة السطوع',
    'contrast': 'زيادة التباين',
    'color': 'تعزيز الألوان'
}

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text('مرحبا! أرسل لي صورة وسأقوم بعرض خيارات الفلاتر المتاحة.')

def apply_filter(image, filter_name):
    if filter_name == 'sharpen':
        return image.filter(ImageFilter.SHARPEN)
    elif filter_name == 'blur':
        return image.filter(ImageFilter.BLUR)
    elif filter_name == 'contour':
        return image.filter(ImageFilter.CONTOUR)
    elif filter_name == 'detail':
        return image.filter(ImageFilter.DETAIL)
    elif filter_name == 'edge_enhance':
        return image.filter(ImageFilter.EDGE_ENHANCE)
    elif filter_name == 'smooth':
        return image.filter(ImageFilter.SMOOTH)
    elif filter_name == 'brightness':
        enhancer = ImageEnhance.Brightness(image)
        return enhancer.enhance(1.5)
    elif filter_name == 'contrast':
        enhancer = ImageEnhance.Contrast(image)
        return enhancer.enhance(1.5)
    elif filter_name == 'color':
        enhancer = ImageEnhance.Color(image)
        return enhancer.enhance(1.5)
    else:
        return image

async def process_image(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if update.message.document:
        file = await context.bot.get_file(update.message.document.file_id)
    elif update.message.photo:
        file = await context.bot.get_file(update.message.photo[-1].file_id)
    else:
        await update.message.reply_text('الرجاء إرسال صورة.')
        return

    image_bytes = await file.download_as_bytearray()
    context.user_data['original_image'] = image_bytes

    keyboard = [
        [InlineKeyboardButton(name, callback_data=filter_name)]
        for filter_name, name in FILTERS.items()
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text('اختر الفلتر الذي تريد تطبيقه:', reply_markup=reply_markup)

async def button(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()

    filter_name = query.data
    original_image = context.user_data.get('original_image')

    if not original_image:
        await query.message.reply_text('حدث خطأ. الرجاء إرسال الصورة مرة أخرى.')
        return

    image = Image.open(io.BytesIO(original_image))
    filtered_image = apply_filter(image, filter_name)

    output = io.BytesIO()
    filtered_image.save(output, format='JPEG')
    output.seek(0)

    await query.message.reply_photo(photo=output, caption=f'تم تطبيق فلتر {FILTERS[filter_name]}')

def main() -> None:
    application = Application.builder().token(TOKEN).build()

    application.add_handler(CommandHandler("start", start))
    application.add_handler(MessageHandler(filters.PHOTO | filters.Document.IMAGE, process_image))
    application.add_handler(CallbackQueryHandler(button))

    application.run_polling()

if name == 'main':
    main()