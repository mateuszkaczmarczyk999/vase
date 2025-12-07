import { Layer } from './Layer';

/**
 * LayerStack manages a collection of layers
 * Layers are ordered with regular layers first, then overlays
 * Updates and renders propagate through all layers
 */
export class LayerStack {
  private layers: Layer[] = [];
  private layerInsertIndex: number = 0; // Insertion point for regular layers (before overlays)

  /**
   * Push a regular layer onto the stack
   * Regular layers are inserted before overlays
   * @param layer The layer to push
   */
  async pushLayer(layer: Layer): Promise<void> {
    this.layers.splice(this.layerInsertIndex, 0, layer);
    this.layerInsertIndex++;
    await layer.onAttach();
  }

  /**
   * Push an overlay layer onto the stack
   * Overlays are always on top of regular layers
   * @param overlay The overlay layer to push
   */
  async pushOverlay(overlay: Layer): Promise<void> {
    this.layers.push(overlay);
    await overlay.onAttach();
  }

  /**
   * Pop a regular layer from the stack
   * @param layer The layer to remove
   */
  popLayer(layer: Layer): void {
    const index = this.layers.indexOf(layer);
    if (index !== -1 && index < this.layerInsertIndex) {
      this.layers.splice(index, 1);
      this.layerInsertIndex--;
      layer.onDetach();
    }
  }

  /**
   * Pop an overlay from the stack
   * @param overlay The overlay to remove
   */
  popOverlay(overlay: Layer): void {
    const index = this.layers.indexOf(overlay);
    if (index !== -1 && index >= this.layerInsertIndex) {
      this.layers.splice(index, 1);
      overlay.onDetach();
    }
  }

  /**
   * Update all layers
   * Called every frame
   * @param deltaTime Time since last frame in seconds
   */
  update(deltaTime: number): void {
    for (const layer of this.layers) {
      layer.onUpdate(deltaTime);
    }
  }

  /**
   * Render all layers
   * Called every frame
   */
  render(): void {
    for (const layer of this.layers) {
      layer.onRender();
    }
  }

  /**
   * Get all layers (read-only)
   * @returns Array of all layers
   */
  getLayers(): readonly Layer[] {
    return this.layers;
  }

  /**
   * Get the number of layers in the stack
   * @returns Number of layers
   */
  getLayerCount(): number {
    return this.layers.length;
  }

  /**
   * Clear all layers from the stack
   * Detaches all layers in reverse order
   */
  clear(): void {
    // Detach in reverse order
    for (let i = this.layers.length - 1; i >= 0; i--) {
      this.layers[i].onDetach();
    }
    this.layers = [];
    this.layerInsertIndex = 0;
  }
}

