import * as Mdast from 'mdast';
import {
  MdxJsxTextElement,
  MdxJsxFlowElement,
  MdxJsxAttribute
} from 'mdast-util-mdx';
import { $createParagraphNode, RootNode } from 'lexical';
import { $createImageNode, MdastImportVisitor } from '@mdxeditor/editor';

export const MdastImageVisitor: MdastImportVisitor<Mdast.Image> = {
  testNode: 'image',
  visitNode({ mdastNode, actions }) {
    actions.addAndStepInto(
      $createImageNode({
        src: mdastNode.url,
        altText: mdastNode.alt || '',
        title: mdastNode.title || ''
      })
    );
  }
};

export const MdastHtmlImageVisitor: MdastImportVisitor<Mdast.HTML> = {
  testNode: (node) => {
    return node.type === 'html' && node.value.trim().startsWith('<img');
  },
  visitNode({ mdastNode, lexicalParent }) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = mdastNode.value;
    const img = wrapper.querySelector('img');

    if (!img) {
      throw new Error('Invalid HTML image');
    }

    const src = img.src;
    const altText = img.alt;
    const title = img.title;
    const width = img.width;
    const height = img.height;

    const image = $createImageNode({
      src: src || '',
      altText,
      title,
      width,
      height
    });

    if (lexicalParent.getType() === 'root') {
      const paragraph = $createParagraphNode();
      paragraph.append(image);
      (lexicalParent as RootNode).append(paragraph);
    } else {
      (lexicalParent as RootNode).append(image);
    }
  }
};

function getAttributeValue(
  node: MdxJsxTextElement | MdxJsxFlowElement,
  attributeName: string
) {
  const attribute = node.attributes.find(
    (a) => a.type === 'mdxJsxAttribute' && a.name === attributeName
  ) as MdxJsxAttribute;
  if (!attribute) {
    return undefined;
  }
  return attribute.value as string | undefined;
}

export const MdastJsxImageVisitor: MdastImportVisitor<
  MdxJsxTextElement | MdxJsxFlowElement
> = {
  testNode: (node) => {
    return (
      (node.type === 'mdxJsxTextElement' ||
        node.type === 'mdxJsxFlowElement') &&
      node.name === 'img'
    );
  },
  visitNode({ mdastNode, lexicalParent }) {
    const src = getAttributeValue(mdastNode, 'src');
    if (!src) {
      return;
    }

    const altText = getAttributeValue(mdastNode, 'alt') || '';
    const title = getAttributeValue(mdastNode, 'title');
    const height = getAttributeValue(mdastNode, 'height');
    const width = getAttributeValue(mdastNode, 'width');

    const image = $createImageNode({
      src,
      altText,
      title,
      width: width ? parseInt(width, 10) : undefined,
      height: height ? parseInt(height, 10) : undefined
    });

    if (lexicalParent.getType() === 'root') {
      const paragraph = $createParagraphNode();
      paragraph.append(image);
      (lexicalParent as RootNode).append(paragraph);
    } else {
      (lexicalParent as RootNode).append(image);
    }
  }
};
