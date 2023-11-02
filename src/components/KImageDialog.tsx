import { corePluginHooks } from '@mdxeditor/editor';
import { imagePluginHooks } from '../plugins/kImagePlugin';

import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';

interface ImageFormFields {
  src: string;
  name: string;
  title: string;
  altText: string;
  file: FileList;
}

export const KImageDialog: React.FC = () => {
  const [imageAutocompleteSuggestions, state] =
    imagePluginHooks.useEmitterValues(
      'imageAutocompleteSuggestions',
      'imageDialogState'
    );

  const saveImage = imagePluginHooks.usePublisher('saveImage');
  const { register, handleSubmit, reset } = useForm<ImageFormFields>({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
    values: state.type === 'editing' ? (state.initialValues as any) : {}
  });
  const [editorRootElementRef] = corePluginHooks.useEmitterValues(
    'editorRootElementRef'
  );
  const closeImageDialog = imagePluginHooks.usePublisher('closeImageDialog');

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    handleSubmit(saveImage)(e);
    reset({ file: undefined, name: '' });
  };

  return (
    <Dialog.Root
      open={state.type !== 'inactive'}
      onOpenChange={(open) => {
        if (!open) {
          closeImageDialog(true);
        }
      }}
    >
      <Dialog.Portal container={editorRootElementRef?.current}>
        <Dialog.Overlay className='dialogOverlay' />
        <Dialog.Content className='dialogContent'>
          {/* <label className='Label' htmlFor='name'>
          Name
        </label> */}
          <form className='multiFieldForm' onSubmit={onSubmit}>
            <div className='formField'>
              <label htmlFor='file'>Upload an image from your device:</label>
              <input
                type='file'
                accept='image/png  image/jpeg'
                required
                {...register('file')}
              />
            </div>

            <div className='formField'>
              <label className='Label' htmlFor='username'>
                Name:
              </label>
              <input
                className='textInput'
                id='name'
                placeholder='input file name'
                required
                {...register('name')}
              />
            </div>
            <div
              style={{
                display: 'flex',
                marginTop: 25,
                justifyContent: 'flex-end',
                gap: '0.5rem'
              }}
            >
              <button
                type='submit'
                className='primaryButton'
                title='Save'
                aria-label='Save'
              >
                Save
              </button>
              <Dialog.Close asChild>
                <button className='secondaryButton'>Cancel</button>
              </Dialog.Close>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
