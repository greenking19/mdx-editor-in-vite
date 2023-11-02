import React from 'react';
import { imagePluginHooks } from '../plugins/kImagePlugin';
import { Button, corePluginHooks } from '@mdxeditor/editor';

export const KInsertImage = React.forwardRef<
  HTMLButtonElement,
  Record<string, never>
>((_, forwardedRef) => {
  const openNewImageDialog =
    imagePluginHooks.usePublisher('openNewImageDialog');
  const [readOnly] = corePluginHooks.useEmitterValues('readOnly');

  return (
    <Button
      content='Click Button'
      ref={forwardedRef}
      disabled={readOnly}
      onClick={() => openNewImageDialog(true)}
    >
      Insert Image
    </Button>
  );
});
