class SoundManager {
    private currentMusic: HTMLAudioElement | null = null;
  
    playSound = (soundName: string) => {
      const audio = new Audio(`/sounds/${soundName}`);
      audio.play().catch(error => {
        console.error('Error playing sound:', error);
      });
    };
  
    playMusic = (soundName: string) => {
      this.stopMusic(); // Stop any existing music
      this.currentMusic = new Audio(`/sounds/${soundName}`);
      this.currentMusic.loop = true;
      this.currentMusic.play().catch(error => {
        console.error('Error playing music:', error);
      });
    };
  
    stopMusic = () => {
      if (this.currentMusic) {
        this.currentMusic.pause();
        this.currentMusic.currentTime = 0;
        this.currentMusic = null;
      }
    };
  }
  
  export const soundManager = new SoundManager();