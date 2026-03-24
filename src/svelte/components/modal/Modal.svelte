<script lang="ts" generics="T extends Component<any>">
    import type { ModalBase, PropsOf } from "src/svelte";
    import { type Component, getContext } from "svelte";

    interface Props {
        modalTitle: string;
        ModalContentComponent: {
            component: T;
            props: PropsOf<T>;
        };
    }

    let { modalTitle, ModalContentComponent }: Props = $props();

    const componentClassInstance = getContext<ModalBase>(
        "componentClassInstance"
    );
</script>

<div class="modal-container mod-dim custom-modal-container">
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div
        class="modal-bg"
        style="opacity: 0.85"
        onclick={componentClassInstance.close}>
    </div>
    <div class="modal custom-modal">
        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
        <div
            class="modal-close-button mod-raised clickable-icon custom-modal-close-button"
            aria-label="Close"
            onclick={componentClassInstance.close}>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="svg-icon lucide-x">
                <path d="M18 6 6 18"></path>
                <path d="m6 6 12 12"></path>
            </svg>
        </div>
        <div class="modal-header custom-modal-header">
            <div class="modal-title custom-modal-title">{modalTitle}</div>
        </div>
        <div class="modal-content custom-modal-content">
            <ModalContentComponent.component {...ModalContentComponent.props} />
        </div>
    </div>
</div>

<style lang="scss">
    .custom-modal-container {
      .custom-modal-header {
        margin-bottom: 0;
      }
    }
</style>
