import type {
  Folder,
  FolderInsert,
  FolderUpdate,
} from '~/types/database.types';
import type { TypedSupabaseClient } from './notes';

export async function listFolders(client: TypedSupabaseClient): Promise<Folder[]> {
  const { data, error } = await client
    .from('folders')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to list folders: ${error.message}`);
  }

  return data ?? [];
}

export async function createFolder(
  client: TypedSupabaseClient,
  userId: string,
  name: string,
): Promise<Folder> {
  const row: FolderInsert = {
    user_id: userId,
    name: name.trim() || 'Untitled folder',
  };

  const { data, error } = await client
    .from('folders')
    .insert(row)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create folder: ${error.message}`);
  }

  return data;
}

export async function updateFolder(
  client: TypedSupabaseClient,
  id: string,
  patch: Pick<FolderUpdate, 'name'>,
): Promise<Folder> {
  const { data, error } = await client
    .from('folders')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update folder: ${error.message}`);
  }

  return data;
}

export async function deleteFolderById(
  client: TypedSupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await client.from('folders').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete folder: ${error.message}`);
  }
}

export async function countNotesInFolder(
  client: TypedSupabaseClient,
  folderId: string,
): Promise<number> {
  const { count, error } = await client
    .from('notes')
    .select('*', { count: 'exact', head: true })
    .eq('folder_id', folderId);

  if (error) {
    throw new Error(`Failed to count notes in folder: ${error.message}`);
  }

  return count ?? 0;
}
