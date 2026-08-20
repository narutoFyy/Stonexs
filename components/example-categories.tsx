'use client';

import { BookOpen, GitCompareArrows, PenTool, Search } from 'lucide-react';
import { memo, useState } from 'react';
import { cn } from '@/lib/utils';

interface ExampleItem {
  text: string;
}

interface Category {
  id: string;
  name: string;
  icon: typeof Search;
  examples: ExampleItem[];
}

const categories: Category[] = [
  {
    id: 'search',
    name: '文献搜索',
    icon: Search,
    examples: [
      { text: '近五年自动驾驶施工区路径规划的英文论文' },
      { text: '面向研究生的中文大语言模型综述' },
      { text: '检索带有开放 PDF 的视觉定位研究' },
    ],
  },
  {
    id: 'compare',
    name: '文献对比',
    icon: GitCompareArrows,
    examples: [
      { text: '比较 Transformer 与扩散模型在轨迹预测中的方法和实验' },
      { text: '整理多传感器融合定位方法的公开数据集和指标' },
      { text: '对比三篇论文的研究问题、方法和局限性' },
    ],
  },
  {
    id: 'figure',
    name: '科研绘图',
    icon: PenTool,
    examples: [
      { text: '为我的自动驾驶规划方法设计一张 SCI 方法流程图' },
      { text: '把实验变量、数据流和评价指标整理成结构图' },
      { text: '绘制一个可编辑的论文模型框架图' },
    ],
  },
];

interface ExampleCategoriesProps {
  onSelectExample: (text: string, group?: string) => void;
  className?: string;
}

export const ExampleCategories = memo(({ onSelectExample, className }: ExampleCategoriesProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const activeCategory = categories.find((category) => category.id === selectedCategory);

  return (
    <div className={cn('w-full', className)}>
      <div className="flex flex-wrap gap-2 border-t border-[#d7bd7b]/30 pt-3">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              className={cn(
                'inline-flex h-9 items-center gap-2 border px-3 text-xs font-medium transition-colors',
                selectedCategory === category.id
                  ? 'border-[#d7bd7b] bg-[#d7bd7b] text-[#0b1822]'
                  : 'border-[#d7bd7b]/35 bg-[#09151e]/75 text-[#d8e0e2] hover:border-[#d7bd7b] hover:text-[#f4eedf]',
              )}
              onClick={() => setSelectedCategory((current) => (current === category.id ? null : category.id))}
              type="button"
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {category.name}
            </button>
          );
        })}
      </div>

      {activeCategory && (
        <div className="mt-2 border border-[#d7bd7b]/35 bg-[#0b1822]/95 text-[#f4eedf] backdrop-blur-md">
          <div className="flex items-center gap-2 border-b border-[#d7bd7b]/20 px-3 py-2 text-xs font-semibold">
            <BookOpen className="h-3.5 w-3.5 text-[#d7bd7b]" aria-hidden="true" />
            {activeCategory.name}
          </div>
          <div className="divide-y divide-[#d7bd7b]/15">
            {activeCategory.examples.map((example) => (
              <button
                key={example.text}
                className="group flex w-full items-center justify-between px-3 py-2.5 text-left text-xs text-[#bec9cc] transition-colors hover:bg-[#d7bd7b]/10 hover:text-[#f4eedf]"
                onClick={() => {
                  onSelectExample(example.text, 'academic');
                  setSelectedCategory(null);
                }}
                type="button"
              >
                <span>{example.text}</span>
                <span className="ml-3 text-[#d7bd7b] opacity-0 transition-opacity group-hover:opacity-100">Enter</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

ExampleCategories.displayName = 'ExampleCategories';
