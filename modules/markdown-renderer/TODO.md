- [ ] Image requires alt text (this needs backend change as well, because currently only the asset
      location is persisted)

- [ ] We need an asset baseUrl config prop, because the editor stores images (and videos) by
      relative path like so `![](/assets/3d089156-1840-4e1a-97eb-3228a12566c2)` Actually, we
      probably need a way to transform the asset source, much like we are doing for references
      Because most of our front end projects only expect the asset id. So a customizable
      transformAssetSource is probably the most flexible solution
