<script lang="ts">
	let { name, colorIndex, size = 'md' }: { name: string; colorIndex: number; size?: 'sm' | 'md' | 'lg' } = $props();

	const hue = $derived((colorIndex * 47) % 360);
	const initial = $derived(name.trim().charAt(0).toUpperCase() || '?');

	const sizeClasses = {
		sm: 'h-6 w-6 text-[0.65rem]',
		md: 'h-8 w-8 text-xs',
		lg: 'h-12 w-12 text-lg'
	};
</script>

<span
	class={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold text-ink ${sizeClasses[size]}`}
	style={`background-color: hsl(${hue} 65% 60%); box-shadow: inset 0 0 0 1px hsl(${hue} 65% 35%);`}
>
	{initial}
</span>
