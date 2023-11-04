import { $wrapNodeInElement } from '@lexical/utils';
import {
  $createImageNode,
  $isImageNode,
  INSERT_IMAGE_COMMAND,
  coreSystem,
  realmPlugin,
  system,
  ImageNode
} from '@mdxeditor/editor';
// types
import { InsertImagePayload } from '@mdxeditor/editor';
import {
  $createParagraphNode,
  $createRangeSelection,
  $getNodeByKey,
  $getSelection,
  $insertNodes,
  $isNodeSelection,
  $isRootOrShadowRoot,
  $setSelection,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  DRAGOVER_COMMAND,
  DRAGSTART_COMMAND,
  DROP_COMMAND,
  LexicalEditor,
  PASTE_COMMAND
} from 'lexical';
import { KImageDialog } from '../components/KImageDialog';
import { MdastHtmlImageVisitor, MdastImageVisitor, MdastJsxImageVisitor } from './imageVisitor';
import { LexicalImageVisitor } from './lexicalImageVisitor';

export type ImageUploadHandler =
  | ((image: File, name?: string) => Promise<string>)
  | null;
export type ImagePreviewHandler =
  | ((imageSource: string) => Promise<string>)
  | null;

export interface InsertImageFormValues {
  src?: string;
  name?: string;
  altText?: string;
  title?: string;
  file: FileList;
}

type InactiveImageDialogState = {
  type: 'inactive';
};

type NewImageDialogState = {
  type: 'new';
};

type EditingImageDialogState = {
  type: 'editing';
  nodeKey: string;
  initialValues: Omit<InsertImageFormValues, 'file'>;
};

const kImageSystem = system(
  (r, [{ rootEditor }]) => {
    const insertImage = r.node<InsertImageFormValues>();
    const imageAutocompleteSuggestions = r.node<string[]>([]);
    const disableImageResize = r.node<boolean>(false);
    const imageUploadHandler = r.node<ImageUploadHandler>(null);
    const imagePreviewHandler = r.node<ImagePreviewHandler>(null);
    const imageDialogState = r.node<
      InactiveImageDialogState | NewImageDialogState | EditingImageDialogState
    >({ type: 'inactive' });
    const openNewImageDialog = r.node<true>();
    const openEditImageDialog = r.node<Omit<EditingImageDialogState, 'type'>>();
    const closeImageDialog = r.node<true>();
    const saveImage = r.node<InsertImageFormValues>();

    r.link(
      r.pipe(closeImageDialog, r.o.mapTo({ type: 'inactive' })),
      imageDialogState
    );
    r.link(
      r.pipe(openNewImageDialog, r.o.mapTo({ type: 'new' })),
      imageDialogState
    );

    r.link(
      r.pipe(
        openEditImageDialog,
        r.o.map((payload) => ({ type: 'editing', ...payload }))
      ),
      imageDialogState
    );
    r.sub(
      r.pipe(
        saveImage,
        r.o.withLatestFrom(rootEditor, imageUploadHandler, imageDialogState)
      ),
      ([values, theEditor, imageUploadHandler, dialogState]) => {
        const handler =
          dialogState.type === 'editing'
            ? (src: string) => {
                theEditor?.update(() => {
                  const { nodeKey } = dialogState;
                  const imageNode = $getNodeByKey(nodeKey) as ImageNode;

                  //   imageNode.setTitle(values.title);
                  //   imageNode.setAltText(values.altText);
                  imageNode.setSrc(src);
                });
                r.pub(imageDialogState, { type: 'inactive' });
              }
            : (src: string) => {
                theEditor?.update(() => {
                  const imageNode = $createImageNode({
                    // altText: values.altText ?? '',
                    // src,
                    // title: values.title ?? ''
                    altText: '',
                    title: '',
                    src
                  });
                  $insertNodes([imageNode]);
                  if ($isRootOrShadowRoot(imageNode.getParentOrThrow())) {
                    $wrapNodeInElement(
                      imageNode,
                      $createParagraphNode
                    ).selectEnd();
                  }
                });
                r.pub(imageDialogState, { type: 'inactive' });
              };

        if (values.file.length > 0) {
          imageUploadHandler?.(values.file.item(0)!, values.name)
            .then(handler)
            .catch((e) => {
              throw e;
            });
        } else if (values.src) {
          handler(values.src);
        }
      }
    );

    r.sub(rootEditor, (editor) => {
      editor?.registerCommand<InsertImagePayload>(
        INSERT_IMAGE_COMMAND,
        (payload) => {
          const imageNode = $createImageNode(payload);
          $insertNodes([imageNode]);
          if ($isRootOrShadowRoot(imageNode.getParentOrThrow())) {
            $wrapNodeInElement(imageNode, $createParagraphNode).selectEnd();
          }

          return true;
        },
        COMMAND_PRIORITY_EDITOR
      );

      const theUploadHandler = r.getValue(imageUploadHandler);

      editor?.registerCommand<DragEvent>(
        DRAGSTART_COMMAND,
        (event) => {
          return onDragStart(event);
        },
        COMMAND_PRIORITY_HIGH
      );
      editor?.registerCommand<DragEvent>(
        DRAGOVER_COMMAND,
        (event) => {
          return onDragover(event);
        },
        COMMAND_PRIORITY_LOW
      );

      editor?.registerCommand<DragEvent>(
        DROP_COMMAND,
        (event) => {
          return onDrop(event, editor, r.getValue(imageUploadHandler));
        },
        COMMAND_PRIORITY_HIGH
      );

      if (theUploadHandler === null) {
        return;
      }

      editor?.registerCommand(
        PASTE_COMMAND,
        (event: ClipboardEvent) => {
          let cbPayload = Array.from(event.clipboardData?.items || []);
          cbPayload = cbPayload.filter((i) => /image/.test(i.type)); // Strip out the non-image bits

          if (!cbPayload.length || cbPayload.length === 0) {
            return false;
          } // If no image was present in the collection, bail.

          const imageUploadHandlerValue = r.getValue(imageUploadHandler)!;

          Promise.all(
            cbPayload.map((file) => imageUploadHandlerValue(file.getAsFile()!))
          )
            .then((urls) => {
              urls.forEach((url) => {
                editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
                  src: url,
                  altText: ''
                });
              });
            })
            .catch((e) => {
              throw e;
            });
          return true;
        },
        COMMAND_PRIORITY_CRITICAL
      );
    });
    return {
      imageDialogState,
      saveImage,
      openNewImageDialog,
      openEditImageDialog,
      closeImageDialog,
      imageUploadHandler,
      imageAutocompleteSuggestions,
      disableImageResize,
      insertImage,
      imagePreviewHandler
    };
  },

  [coreSystem]
);

const CAN_USE_DOM: boolean =
  typeof window !== 'undefined' &&
  typeof window.document !== 'undefined' &&
  typeof window.document.createElement !== 'undefined';

const getDOMSelection = (targetWindow: Window | null): Selection | null =>
  CAN_USE_DOM ? (targetWindow || window).getSelection() : null;

const TRANSPARENT_IMAGE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function onDragStart(event: DragEvent): boolean {
  const node = getImageNodeInSelection();
  if (!node) {
    return false;
  }
  const dataTransfer = event.dataTransfer;
  if (!dataTransfer) {
    return false;
  }
  dataTransfer.setData('text/plain', '_');
  const img = document.createElement('img');
  img.src = TRANSPARENT_IMAGE;
  dataTransfer.setDragImage(img, 0, 0);
  dataTransfer.setData(
    'application/x-lexical-drag',
    JSON.stringify({
      data: {
        altText: node.__altText,
        title: node.__title,
        key: node.getKey(),
        src: node.__src
      },
      type: 'image'
    })
  );

  return true;
}

function onDragover(event: DragEvent): boolean {
  // test if the user is dragging a file from the explorer
  let cbPayload = Array.from(event.dataTransfer?.items || []);
  cbPayload = cbPayload.filter((i) => /image/.test(i.type)); // Strip out the non-image bits

  if (cbPayload.length > 0) {
    event.preventDefault();
    return true;
  }

  // handle moving images
  const node = getImageNodeInSelection();
  if (!node) {
    return false;
  }
  if (!canDropImage(event)) {
    event.preventDefault();
  }

  return true;
}

function onDrop(
  event: DragEvent,
  editor: LexicalEditor,
  imageUploadHandler: ImageUploadHandler
): boolean {
  let cbPayload = Array.from(event.dataTransfer?.items || []);
  cbPayload = cbPayload.filter((i) => /image/.test(i.type)); // Strip out the non-image bits

  if (cbPayload.length > 0) {
    if (imageUploadHandler !== null) {
      event.preventDefault();
      Promise.all(
        cbPayload.map((image) => imageUploadHandler(image.getAsFile()!))
      )
        .then((urls) => {
          urls.forEach((url) => {
            editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
              src: url,
              altText: ''
            });
          });
        })
        .catch((e) => {
          throw e;
        });

      return true;
    }
  }

  const node = getImageNodeInSelection();
  if (!node) {
    return false;
  }
  const data = getDragImageData(event);

  if (!data) {
    return false;
  }

  event.preventDefault();
  if (canDropImage(event)) {
    const range = getDragSelection(event);
    node.remove();
    const rangeSelection = $createRangeSelection();
    if (range !== null && range !== undefined) {
      rangeSelection.applyDOMRange(range);
    }
    $setSelection(rangeSelection);
    editor.dispatchCommand(INSERT_IMAGE_COMMAND, data);
  }
  return true;
}

function getImageNodeInSelection(): ImageNode | null {
  const selection = $getSelection();
  if (!$isNodeSelection(selection)) {
    return null;
  }
  const nodes = selection.getNodes();
  const node = nodes[0];
  return $isImageNode(node) ? node : null;
}

function getDragImageData(event: DragEvent): null | InsertImagePayload {
  const dragData = event.dataTransfer?.getData('application/x-lexical-drag');
  if (!dragData) {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { type, data } = JSON.parse(dragData);
  if (type !== 'image') {
    return null;
  }

  return data;
}

declare global {
  interface DragEvent {
    rangeOffset?: number;
    rangeParent?: Node;
  }
}

function canDropImage(event: DragEvent): boolean {
  const target = event.target;
  return !!(target && target instanceof HTMLElement && target.parentElement);
}

function getDragSelection(event: DragEvent): Range | null | undefined {
  let range;
  const target = event.target as null | Element | Document;
  const targetWindow =
    target == null
      ? null
      : target.nodeType === 9
      ? (target as Document).defaultView
      : (target as Element).ownerDocument.defaultView;
  const domSelection = getDOMSelection(targetWindow);
  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(event.clientX, event.clientY);
  } else if (event.rangeParent && domSelection !== null) {
    domSelection.collapse(event.rangeParent, event.rangeOffset || 0);
    range = domSelection.getRangeAt(0);
  } else {
    throw Error(`Cannot get the selection when dragging`);
  }

  return range;
}

interface ImagePluginParams {
  imageUploadHandler?: ImageUploadHandler;
  imageAutocompleteSuggestions?: string[];
  disableImageResize?: boolean;
  imagePreviewHandler?: ImagePreviewHandler;
}

export const [imagePlugin, imagePluginHooks] = realmPlugin({
  id: 'kImage',
  systemSpec: kImageSystem,
  applyParamsToSystem: (realm, params: ImagePluginParams) => {
    realm.pubKey('imageUploadHandler', params?.imageUploadHandler || null);
    realm.pubKey(
      'imageAutocompleteSuggestions',
      params?.imageAutocompleteSuggestions || []
    );
    realm.pubKey('disableImageResize', Boolean(params?.disableImageResize));
    realm.pubKey('imagePreviewHandler', params?.imagePreviewHandler || null);
  },

  init: (realm) => {
    realm.pubKey('addImportVisitor', MdastImageVisitor);
    realm.pubKey('addImportVisitor', MdastHtmlImageVisitor);
    realm.pubKey('addImportVisitor', MdastJsxImageVisitor);
    realm.pubKey('addLexicalNode', ImageNode);
    realm.pubKey('addExportVisitor', LexicalImageVisitor);
    realm.pubKey('addComposerChild', KImageDialog);
  }
});
