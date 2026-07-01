import type { Locale } from '../core/i18n/i18n';

/**
 * Russian locale. Shipped as a standalone module (`@jodit/image-editor/locales/ru`)
 * so it is loaded only when imported — the core bundle stays English-only.
 */
const ru: Locale = {
  id: 'ru',
  name: 'Русский',
  messages: {
    Save: 'Сохранить',
    'Save as': 'Сохранить как',
    'Zoom out': 'Отдалить',
    'Zoom in': 'Приблизить',
    Reset: 'Сбросить',
    Undo: 'Отменить',
    Redo: 'Повторить',
    Adjust: 'Изменить',
    Finetune: 'Тонкая настройка',
    Filters: 'Фильтры',
    Watermark: 'Водяной знак',
    Annotate: 'Аннотации',
    Resize: 'Размер',
    Crop: 'Обрезка',
    Rotate: 'Поворот',
    'Flip X': 'Отразить по X',
    'Flip Y': 'Отразить по Y',
    Brightness: 'Яркость',
    Contrast: 'Контраст',
    Saturation: 'Насыщенность',
    Blur: 'Размытие',
    Warmth: 'Теплота',
    Original: 'Оригинал',
    Invert: 'Инверсия',
    'Black & White': 'Чёрно-белый',
    Sepia: 'Сепия',
    Solarize: 'Соляризация',
    Width: 'Ширина',
    Height: 'Высота',
    px: 'пикс',
    'Aspect ratio locked': 'Пропорции зафиксированы',
    'Aspect ratio unlocked': 'Пропорции свободны',
    'Reset size': 'Сбросить размер',
    Size: 'Размер',
    Left: 'Слева',
    Center: 'По центру',
    Right: 'Справа',
    Delete: 'Удалить',
    Text: 'Текст',
    'Watermark text': 'Текст водяного знака',
    'Add watermark': 'Добавить водяной знак',
    'Reset all changes? You can still undo afterwards.':
      'Сбросить все изменения? Их можно будет отменить.',
  },
};

export default ru;
