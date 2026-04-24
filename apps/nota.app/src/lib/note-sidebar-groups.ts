import type { Folder, Note } from '~/types/database.types';
import { persistedDisplayTitle } from './note-title';

export function compareNoteTitles(a: Note, b: Note): number {
  return persistedDisplayTitle(a.title).localeCompare(
    persistedDisplayTitle(b.title),
    undefined,
    { sensitivity: 'base' },
  );
}

export function compareFolderNames(a: Folder, b: Folder): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

export type SidebarFolderSection = {
  folder: Folder;
  notes: Note[];
};

export function buildSidebarFolderSections(
  notes: Note[],
  folders: Folder[],
): { sections: SidebarFolderSection[]; rootNotes: Note[] } {
  const sortedFolders = [...folders].sort(compareFolderNames);
  const sections: SidebarFolderSection[] = sortedFolders.map((folder) => ({
    folder,
    notes: notes
      .filter((n) => n.folder_id === folder.id)
      .sort(compareNoteTitles),
  }));

  const rootNotes = notes
    .filter((n) => n.folder_id == null)
    .sort(compareNoteTitles);

  return { sections, rootNotes };
}
