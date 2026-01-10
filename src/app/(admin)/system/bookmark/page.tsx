'use client';

import { useState } from 'react';

interface Bookmark {
  id: number;
  name: string;
  url: string;
  folder: string;
  tags: string[];
  createdAt: string;
}

export default function BookmarkManagementPage() {
  const [bookmarks, setBookmarks] = useState([
    {
      id: 1,
      name: '技术博客',
      url: 'https://tech-blog.com',
      folder: '学习',
      tags: ['技术', '博客'],
      createdAt: '2024-01-15',
    },
    {
      id: 2,
      name: '设计资源',
      url: 'https://design-resources.com',
      folder: '工作',
      tags: ['设计', '资源'],
      createdAt: '2024-01-10',
    },
    {
      id: 3,
      name: '新闻资讯',
      url: 'https://news-site.com',
      folder: '日常',
      tags: ['新闻', '资讯'],
      createdAt: '2024-01-05',
    },
  ]);
  const [folders, setFolders] = useState(['学习', '工作', '日常']);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('全部');
  const [showModal, setShowModal] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);

  // 过滤书签
  const filteredBookmarks = bookmarks.filter((bookmark) => {
    const matchesSearch =
      bookmark.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesFolder =
      selectedFolder === '全部' || bookmark.folder === selectedFolder;

    return matchesSearch && matchesFolder;
  });

  const handleAddBookmark = () => {
    setEditingBookmark(null);
    setShowModal(true);
  };

  const handleEditBookmark = (bookmark: Bookmark) => {
    setEditingBookmark(bookmark);
    setShowModal(true);
  };

  const handleDeleteBookmark = (id: number) => {
    if (confirm('确定要删除这个书签吗？')) {
      setBookmarks(bookmarks.filter((bookmark) => bookmark.id !== id));
    }
  };

  const handleSaveBookmark = (bookmarkData: Partial<Bookmark>) => {
    if (editingBookmark) {
      // 编辑书签
      setBookmarks(
        bookmarks.map((bookmark) =>
          bookmark.id === editingBookmark.id
            ? { ...bookmark, ...bookmarkData }
            : bookmark
        )
      );
    } else {
      // 添加书签
      const newBookmark: Bookmark = {
        id: Math.max(...bookmarks.map((b) => b.id), 0) + 1,
        name: bookmarkData.name || '',
        url: bookmarkData.url || '',
        folder: bookmarkData.folder || '',
        tags: bookmarkData.tags || [],
        createdAt: new Date().toISOString().split('T')[0],
      };
      setBookmarks([...bookmarks, newBookmark]);

      // 如果是新文件夹，添加到文件夹列表
      if (bookmarkData.folder && !folders.includes(bookmarkData.folder)) {
        setFolders([...folders, bookmarkData.folder]);
      }
    }
    setShowModal(false);
  };

  return (
    <div className="">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          书签管理
        </h1>
        <button
          onClick={handleAddBookmark}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
        >
          添加书签
        </button>
      </div>

      {/* 筛选和搜索 */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="搜索书签..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg
            className="absolute right-3 top-2.5 h-5 w-5 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        <select
          value={selectedFolder}
          onChange={(e) => setSelectedFolder(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="全部">全部文件夹</option>
          {folders.map((folder) => (
            <option key={folder} value={folder}>
              {folder}
            </option>
          ))}
        </select>
      </div>

      {/* 文件夹列表 */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          文件夹
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedFolder('全部')}
            className={`px-3 py-1 rounded-full text-sm ${
              selectedFolder === '全部'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}
          >
            全部 ({bookmarks.length})
          </button>
          {folders.map((folder) => (
            <button
              key={folder}
              onClick={() => setSelectedFolder(folder)}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedFolder === folder
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
              }`}
            >
              {folder} ({bookmarks.filter((b) => b.folder === folder).length})
            </button>
          ))}
        </div>
      </div>

      {/* 书签列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                名称
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                URL
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                文件夹
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                标签
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                创建时间
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredBookmarks.map((bookmark) => (
              <tr key={bookmark.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {bookmark.name}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 dark:text-white truncate max-w-xs">
                    <a
                      href={bookmark.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700"
                    >
                      {bookmark.url}
                    </a>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {bookmark.folder}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {bookmark.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {bookmark.createdAt}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEditBookmark(bookmark)}
                    className="text-blue-500 hover:text-blue-700 mr-3"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDeleteBookmark(bookmark.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 书签编辑模态框 */}
      {showModal && (
        <BookmarkModal
          bookmark={editingBookmark}
          folders={folders}
          onSave={handleSaveBookmark}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

interface BookmarkFormData extends Partial<Bookmark> {
  newTag?: string;
  newFolder?: string;
}

function BookmarkModal({
  bookmark,
  folders,
  onSave,
  onClose,
}: {
  bookmark: Bookmark | null;
  folders: string[];
  onSave: (bookmark: Partial<Bookmark>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<BookmarkFormData>(
    bookmark || {
      name: '',
      url: '',
      folder: folders[0] || '',
      tags: [],
      newTag: '',
    }
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    } as BookmarkFormData);
  };

  const handleAddTag = () => {
    if (
      formData.newTag &&
      formData.newTag.trim() &&
      formData.tags &&
      !formData.tags.includes(formData.newTag.trim())
    ) {
      setFormData({
        ...formData,
        tags: [...formData.tags, formData.newTag.trim()],
        newTag: '',
      } as BookmarkFormData);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((tag: string) => tag !== tagToRemove),
    } as BookmarkFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 从formData中移除newTag和newFolder属性，因为它们不在Bookmark接口中
    const bookmarkData = { ...formData };
    delete bookmarkData.newTag;
    delete bookmarkData.newFolder;
    onSave(bookmarkData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {bookmark ? '编辑书签' : '添加书签'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              名称
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="url"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              URL
            </label>
            <input
              type="url"
              id="url"
              name="url"
              value={formData.url}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="folder"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              文件夹
            </label>
            <select
              id="folder"
              name="folder"
              value={formData.folder}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {folders.map((folder) => (
                <option key={folder} value={folder}>
                  {folder}
                </option>
              ))}
              <option value="">新建文件夹</option>
            </select>
            {formData.folder === '' && (
              <input
                type="text"
                name="newFolder"
                placeholder="输入新文件夹名称"
                onChange={handleChange}
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              标签
            </label>
            <div className="flex flex-wrap gap-1 mb-2">
              {(formData.tags || []).map((tag: string, index: number) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex">
              <input
                type="text"
                name="newTag"
                value={formData.newTag}
                onChange={handleChange}
                onKeyDown={(e) =>
                  e.key === 'Enter' && (e.preventDefault(), handleAddTag())
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="输入标签并按回车添加"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-2 bg-gray-200 text-gray-800 rounded-r-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
              >
                添加
              </button>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 border border-transparent rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
