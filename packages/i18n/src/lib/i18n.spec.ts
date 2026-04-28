import { createTranslator, resolveLocale, t } from './i18n.js';

describe('i18n', () => {
  it('translates British English keys for Spanish and Portuguese', () => {
    // Arrange
    const spanish = createTranslator('Spanish (Spain)');
    const portuguese = createTranslator('Portuguese (Brazil)');

    // Act
    const spanishFolder = spanish.t('Folder');
    const portugueseMoveFolder = portuguese.t('Move folder');

    // Assert
    expect(spanishFolder).toBe('Carpeta');
    expect(portugueseMoveFolder).toBe('Mover pasta');
  });

  it('falls back to the system locale before English (United Kingdom)', () => {
    // Arrange
    const systemLocale = ['pt-BR'];

    // Act
    const resolved = resolveLocale(null, systemLocale);
    const translator = createTranslator(null, systemLocale);
    const translated = translator.t('New folder');

    // Assert
    expect(resolved).toBe('pt-BR');
    expect(translated).toBe('Nova pasta');
  });

  it('falls back to English (United Kingdom) when nothing matches', () => {
    // Arrange
    const systemLocale = ['zz-ZZ'];

    // Act
    const resolved = resolveLocale(null, systemLocale);
    const translated = t('Folder', null, systemLocale);

    // Assert
    expect(resolved).toBe('en-GB');
    expect(translated).toBe('Folder');
  });

  it('returns the British English phrase when no translation exists', () => {
    // Arrange
    const translator = createTranslator('Spanish (Spain)');

    // Act
    const translated = translator.t('Untranslated phrase');

    // Assert
    expect(translated).toBe('Untranslated phrase');
  });

  it('replaces placeholders with provided values', () => {
    // Arrange
    const translator = createTranslator('Spanish (Spain)');

    // Act
    const translated = translator.t('This value is {totalCount}', {
      totalCount: 3,
    });

    // Assert
    expect(translated).toBe('Este valor es 3');
  });

  it('replaces placeholders in British English fallback', () => {
    // Arrange
    const translator = createTranslator('en-GB');

    // Act
    const translated = translator.t('This value is {totalCount}', {
      totalCount: 42,
    });

    // Assert
    expect(translated).toBe('This value is 42');
  });

  it('translates Canadian English returns key as-is', () => {
    // Arrange
    const translator = createTranslator('en-CA');

    // Act
    const folder = translator.t('Folder');
    const newFolder = translator.t('New folder');

    // Assert
    expect(folder).toBe('Folder');
    expect(newFolder).toBe('New folder');
  });

  it('translates settings and shell chrome for Spanish', () => {
    // Arrange
    const translator = createTranslator('es-ES');

    // Act
    const settings = translator.t('Settings');
    const appearance = translator.t('Appearance');
    const shortcuts = translator.t('Shortcuts');
    const noteGraph = translator.t('Note Graph');

    // Assert
    expect(settings).toBe('Ajustes');
    expect(appearance).toBe('Apariencia');
    expect(shortcuts).toBe('Atajos');
    expect(noteGraph).toBe('Grafo de notas');
  });

  it('translates Canadian French correctly', () => {
    // Arrange
    const translator = createTranslator('fr-CA');

    // Act
    const folder = translator.t('Folder');
    const newFolder = translator.t('New folder');
    const cancel = translator.t('Cancel');

    // Assert
    expect(folder).toBe('Dossier');
    expect(newFolder).toBe('Nouveau dossier');
    expect(cancel).toBe('Annuler');
  });

  it('resolves Canadian locales from system', () => {
    // Arrange
    const systemLocale = ['fr-CA'];

    // Act
    const resolved = resolveLocale(null, systemLocale);
    const translator = createTranslator(null, systemLocale);
    const translated = translator.t('Create');

    // Assert
    expect(resolved).toBe('fr-CA');
    expect(translated).toBe('Créer');
  });
});
